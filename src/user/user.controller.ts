import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import multer from 'multer';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { uploadFileToSupabase } from 'src/utils/common/uploadFileToSupabase';
import { AuthGuard } from '../common/guards/auth/auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ROLE } from './entities/role.entity';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private configService: ConfigService,
  ) {}
  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Get('/me')
  me(@Req() req: Request & { user: { id: string } }) {
    return this.userService.getMyProfileInfo(req.user.id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async create(
    @Body() body: { data: string },
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const parsed = JSON.parse(body.data) as unknown;
    let userRegistrationData: Partial<CreateUserDto> & { image?: string } = {};

    if (parsed && typeof parsed === 'object') {
      userRegistrationData = parsed as Partial<CreateUserDto> & {
        image?: string;
      };
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

    return this.userService.create(userRegistrationData as CreateUserDto);
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
