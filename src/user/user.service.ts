import { User } from './entities/user.entity';
import {
  Injectable,
  NotFoundException,
  Controller,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { sendResponse } from 'src/utils/sendResponse';
import { sendVerificationEmail } from 'src/utils/sendVerificationEmail';
import { generateOtpEmailTemplate } from 'src/utils/generateOtpEmailTemplate';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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
      'User Registration Successfully, Check your email to verify your account',
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
      'Verification OTP Resend Successfully, Check your email to verify your account',
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
