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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
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
