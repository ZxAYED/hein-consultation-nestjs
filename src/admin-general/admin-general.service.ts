import { Injectable } from '@nestjs/common';
import {
  ToggleSettingsDto,
  UpdateAdminGeneralSettingsDto,
} from './dto/admin-general.dto';
import { uploadFileToSupabase } from 'src/utils/common/uploadFileToSupabase';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminGeneralService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly ADMIN_GENERAL_SETTINGS = 'AdminGeneralSettingSingletonId';

  async updateGeneralSettings(
    payload: UpdateAdminGeneralSettingsDto,
    image?: Express.Multer.File,
  ) {
    let imageLink: string | undefined;

    // Upload image if provided
    if (image) {
      imageLink = await uploadFileToSupabase(
        image,
        this.configService,
        'platform-logos',
      );
    }

    // Get existing settings
    const existing = await this.prisma.adminGeneralSetting.findUnique({
      where: { id: this.ADMIN_GENERAL_SETTINGS },
    });

    // Upsert the settings
    return this.prisma.adminGeneralSetting.upsert({
      where: { id: this.ADMIN_GENERAL_SETTINGS },
      update: {
        currency: payload.currency ?? existing?.currency,
        language: payload.language ?? existing?.language,
        logo: imageLink ?? existing?.logo,
        platformName: payload.platformName ?? existing?.platformName,
        slogan: payload.slogan ?? existing?.slogan,
        timezone: payload.timezone ?? existing?.timezone,
      },
      create: {
        currency: payload.currency ?? 'USD',
        language: payload.language ?? 'en',
        logo: imageLink ?? '',
        platformName: payload.platformName ?? 'Default Platform',
        slogan: payload.slogan ?? 'Default Slogan',
        timezone: payload.timezone ?? 'UTC',
      },
    });
  }

  async toggleSettings(payload: ToggleSettingsDto) {
    return await this.prisma.adminGeneralSetting.upsert({
      where: { id: this.ADMIN_GENERAL_SETTINGS },
      update: {
        isBlogModuleEnabled: payload.isBlogModuleEnabled,
        isServiceModuleEnabled: payload.isServiceModuleEnabled,
      },
      create: {
        id: this.ADMIN_GENERAL_SETTINGS, // required for upsert
        isBlogModuleEnabled: payload.isBlogModuleEnabled ?? false,
        isServiceModuleEnabled: payload.isServiceModuleEnabled ?? false,
        platformName: 'Default Platform', // optional defaults
        slogan: 'Default Slogan',
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
        logo: '',
      },
    });
  }

  async getGeneralSettings() {
    const ID = this.ADMIN_GENERAL_SETTINGS;

    const settings = await this.prisma.adminGeneralSetting.findUnique({
      where: { id: ID },
    });

    if (settings) {
      return settings;
    }

    // TODO: Fill with real data
    return this.prisma.adminGeneralSetting.create({
      data: {
        platformName: '',
        slogan: '',
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
        logo: '',
        isBlogModuleEnabled: false,
        isServiceModuleEnabled: false,
      },
    });
  }
}
