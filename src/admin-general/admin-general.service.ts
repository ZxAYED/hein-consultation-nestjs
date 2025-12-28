import { Injectable } from '@nestjs/common';
import { UpdateAdminGeneralSettingsDto } from './dto/admin-general.dto';
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

    // Build update and create objects
    const updateData: any = {
      platformName: payload.platformName ?? existing?.platformName,
      slogan: payload.slogan ?? existing?.slogan,
      language: payload.language ?? existing?.language,
      timezone: payload.timezone ?? existing?.timezone,
      currency: payload.currency ?? existing?.currency,
      isBlogModuleEnabled:
        payload.isBlogModuleEnabled ?? existing?.isBlogModuleEnabled ?? false,
      isServiceModuleEnabled:
        payload.isServiceModuleEnabled ??
        existing?.isServiceModuleEnabled ??
        false,
      ...(imageLink && { logo: imageLink }),
    };

    const createData: any = {
      id: this.ADMIN_GENERAL_SETTINGS,
      platformName: payload.platformName ?? 'Default Platform',
      slogan: payload.slogan ?? 'Default Slogan',
      language: payload.language ?? 'en',
      timezone: payload.timezone ?? 'UTC',
      currency: payload.currency ?? 'USD',
      isBlogModuleEnabled: payload.isBlogModuleEnabled ?? false,
      isServiceModuleEnabled: payload.isServiceModuleEnabled ?? false,
      logo: imageLink ?? '',
    };

    // Upsert the settings
    return this.prisma.adminGeneralSetting.upsert({
      where: { id: this.ADMIN_GENERAL_SETTINGS },
      update: updateData,
      create: createData,
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
