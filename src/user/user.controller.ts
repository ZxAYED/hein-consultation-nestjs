import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../common/guards/auth/auth.guard';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { ROLE } from './entities/role.entity';
import { Request } from 'express';
import { uploadFileToSupabase } from 'src/utils/common/uploadFileToSupabase';
import multer from 'multer';
import { ConfigService } from '@nestjs/config';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private configService: ConfigService,
  ) {}
  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Get('/me')
  me(@Req() req: Request & { user: any }) {
    return this.userService.getMyProfileInfo(req?.user?.id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async create(
    @Body() body: any,
    @UploadedFile() image?: Express.Multer.File, // এখানে '?' দিয়ে optional করা হয়েছে
  ) {
    const data = body.data;
    const parsed = JSON.parse(data);
    let userRegistrationData: any = {};

    // console.log(parsed);

    if (parsed) {
      userRegistrationData = { ...parsed };
    }

    if (image) {
      console.log(image);
      const imageLink = await uploadFileToSupabase(
        image,
        this.configService, // <-- important
        'user-uploads', // optional folder
      );
      // console.log('🚀 ~ UserController ~ create ~ imageLink:', imageLink);
      userRegistrationData.image = imageLink;
    }

    return this.userService.create(userRegistrationData);
  }

  @Post('/resend-register-otp')
  resendRegistrationVerifyOtp(@Body('email') email: string) {
    return this.userService.resendRegistrationVerifyOtp(email);
  }

  @Post('/verify-register-otp')
  verifyRegisterOtp(@Body('email') email: string, @Body('otp') otp: string) {
    return this.userService.verifyRegisterOtp(email, otp);
  }

  @Post('/login')
  login(@Body('email') email: string, @Body('password') password: string) {
    return this.userService.login(email, password);
  }

  @Post('/resend-login-otp')
  resendLoginOtp(@Body('email') email: string) {
    return this.userService.resendLoginOtp(email);
  }

  @Post('/verify-login-otp')
  verifyLoginOtp(@Body('email') email: string, @Body('otp') otp: string) {
    return this.userService.verifyLoginOtp(email, otp);
  }

  @Post('/change-password')
  changePassword(
    @Body('email') email: string,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.userService.changePassword(email, oldPassword, newPassword);
  }

  @Post('/forgotten-password')
  forgottenPassword(@Body('email') email: string) {
    return this.userService.forgottenPassword(email);
  }

  @Post('/verify-forgotten-password-otp')
  verifyForgottenPasswordOtp(
    @Body('email') email: string,
    @Body('otp') otp: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.userService.verifyForgottenPasswordOtp(email, otp, newPassword);
  }
  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Patch('update-profile')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async updateProfile(
  @Req() req: Request & { user: any },
  @Body() body?: any,
    @UploadedFile() image?: Express.Multer.File,
  ) {
  let userUpdateData: any = {};

    // 🟢 BODY OPTIONAL
    if (body?.data) {
      try {
      const parsed = JSON.parse(body.data);
      userUpdateData = { ...parsed };
    } catch (err) {
        throw new BadRequestException('Invalid JSON format in data field');
      }
    }

  // 🟢 IMAGE OPTIONAL
    if (image) {
      const imageLink = await uploadFileToSupabase(
        image,
        this.configService,
        'user-uploads',
      );
      userUpdateData.image = imageLink;
    }

  // ❌ nothing provided
    if (Object.keys(userUpdateData).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return this.userService.updateProfile(req.user.id, userUpdateData);
  }
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
