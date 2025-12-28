import {
  Body,
  Controller,
  Get,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdminGeneralService } from './admin-general.service';
import { ToggleSettingsDto, UpdateAdminGeneralSettingsDto } from './dto/admin-general.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { ROLE } from 'src/user/entities/role.entity';

@Controller('admin-general')
export class AdminGeneralController {
  constructor(private readonly adminGeneralService: AdminGeneralService) {}

  @Patch('/update')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  async updateGeneralSettings(
    @Body() payload: UpdateAdminGeneralSettingsDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.adminGeneralService.updateGeneralSettings(payload, image);
  }

  @Patch('/toggle')
  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  async toggleSettings(@Body() payload: ToggleSettingsDto) {
    return this.adminGeneralService.toggleSettings(payload);
  }

  @Get('/')
  async getGeneralSettings() {
    return this.adminGeneralService.getGeneralSettings();
  }
}
