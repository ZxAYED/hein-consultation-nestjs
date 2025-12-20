import { User } from './entities/user.entity';
import {
  Injectable,
  NotFoundException,
  Controller,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { sendResponse } from 'src/utils/sendResponse';
import { sendVerificationEmail } from 'src/utils/sendVerificationEmail';
import { generateOtpEmailTemplate } from 'src/utils/generateOtpEmailTemplate';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { first } from 'rxjs';
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // console.log(createUserDto);

    const isUserAlreadyExist = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (isUserAlreadyExist) {
      throw new ConflictException('User already exist');
    }

    // Generate 6-digit OTP
    const generateOtp = () =>
      Math.floor(100000 + Math.random() * 900000).toString();
    const otp = generateOtp();
    // console.log('Generated OTP:', otp);

    // OTP validity 10 minutes
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    // console.log('OTP valid until:', otpExpiry);

    const hashPassword = await bcrypt.hash(createUserDto.password, 10);
    console.log('🚀 ~ UserService ~ create ~ hashPassword:', hashPassword);

    const userRegistrationData = {
      ...createUserDto,
      password: hashPassword,
      registrationOtp: otp,
      registrationOtpExpireIn: otpExpiry,
    };

    // console.log(userRegistrationData);

    // Create user in DB
    await this.prisma.user.create({ data: userRegistrationData });
    // Generate email HTML
    const htmlText = generateOtpEmailTemplate(otp);

    // Send verification email
    await sendVerificationEmail(
      createUserDto.email, // user email
      'Verify your account',
      htmlText,
    );

    return sendResponse(
      'User Registration Successfully, Check your email to verify your account, You have 10 minutes to verify your login. If you did not receive the email, please check your spam folder.',
    );
  }

  async resendRegistrationVerifyOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new ConflictException('User already verified');
    }

    // Generate 6-digit OTP
    const generateOtp = () =>
      Math.floor(100000 + Math.random() * 900000).toString();
    const otp = generateOtp();
    // console.log('Generated OTP:', otp);

    // OTP validity 10 minutes
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    // console.log('OTP valid until:', otpExpiry);

    await this.prisma.user.update({
      where: { email },
      data: {
        registrationOtp: otp,
        registrationOtpExpireIn: otpExpiry,
      },
    });

    // Generate email HTML
    const htmlText = generateOtpEmailTemplate(otp);

    // Send verification email
    await sendVerificationEmail(
      email, // user email
      'Verify your account',
      htmlText,
    );

    return sendResponse(
      'Verification OTP Resend Successfully, Check your email to verify your account, You have 10 minutes to verify your login. If you did not receive the email, please check your spam folder.',
    );
  }

  async verifyRegisterOtp(email: string, otp: string) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!isUserExist) {
      throw new NotFoundException('User not found');
    }

    if (isUserExist.isVerified) {
      throw new ConflictException('User already verified');
    }

    if (isUserExist.registrationOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
    if ((isUserExist.registrationOtpExpireIn as Date) < new Date()) {
      throw new BadRequestException('OTP Expired');
    }

    const result = await this.prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        registrationOtp: null,
        registrationOtpExpireIn: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    return sendResponse('User Verified Successfully', result);
  }

  async login(email: string, password: string) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!isUserExist) {
      throw new NotFoundException('User not found');
    }
    if (!isUserExist.isVerified) {
      throw new ConflictException('User not verified');
    }
    const isPasswordMatch = await bcrypt.compare(
      password,
      isUserExist.password,
    );
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid Password');
    }

    const generateOtp = () =>
      Math.floor(100000 + Math.random() * 900000).toString();
    const otp = generateOtp();
    // console.log('Generated OTP:', otp);

    // OTP validity 10 minutes
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.user.update({
      where: { email },
      data: {
        loginOtp: otp,
        loginOtpExpireIn: otpExpiry,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    // Generate email HTML
    const htmlText = generateOtpEmailTemplate(otp);

    // Send verification email
    await sendVerificationEmail(
      email, // user email
      'Verify your login',
      htmlText,
    );

    return sendResponse(
      'User Login Successfully, Check your email to verify your account, You have 10 minutes to verify your login. If you did not receive the email, please check your spam folder.',
    );
  }

  async resendLoginOtp(email: string) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!isUserExist) {
      throw new NotFoundException('User not found');
    }
    if (!isUserExist.isVerified) {
      throw new ConflictException('User not verified');
    }

    const generateOtp = () =>
      Math.floor(100000 + Math.random() * 900000).toString();
    const otp = generateOtp();
    // console.log('Generated OTP:', otp);

    // OTP validity 10 minutes
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.user.update({
      where: { email },
      data: {
        loginOtp: otp,
        loginOtpExpireIn: otpExpiry,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    // Generate email HTML
    const htmlText = generateOtpEmailTemplate(otp);

    // Send verification email
    await sendVerificationEmail(
      email, // user email
      'Verify your login',
      htmlText,
    );

    return sendResponse(
      'OTP resend Successfully, Check your email to verify your account, You have 10 minutes to verify your login. If you did not receive the email, please check your spam folder.',
    );
  }

  async verifyLoginOtp(email: string, otp: string) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!isUserExist) {
      throw new NotFoundException('User not found');
    }
    if (!isUserExist.isVerified) {
      throw new ConflictException('User not verified');
    }
    if (isUserExist.loginOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
    if ((isUserExist.loginOtpExpireIn as Date) < new Date()) {
      throw new BadRequestException('OTP Expired');
    }

    const result = await this.prisma.user.update({
      where: { email },
      data: {
        loginOtp: null,
        loginOtpExpireIn: null,
      },
    });

    const access_token = this.jwtService.sign({
      id: result.id,
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      role: result.role,
    });
    console.log(
      '🚀 ~ UserService ~ verifyLoginOtp ~ access_token:',
      access_token,
    );

    return sendResponse('User Verified Successfully', { access_token });
  }

  async getMyProfileInfo(id: string) {
    const result = await this.prisma.user.findUnique({
      where: { id },
      include: {
        blogs: true,
        invoices: true,
        documents: true,
      },
    });

    return sendResponse('Profile Information Fetched Successfully', result);
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
