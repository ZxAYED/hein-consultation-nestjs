import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  Req,
  Get,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { ROLE } from 'src/user/entities/role.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { generateUniqueSlug } from 'src/common/utils/generateUniqueSlug';
import { uploadFileToSupabase } from 'src/utils/common/uploadFileToSupabase';
import { BlogStatus, ServiceStatus } from '@prisma/client';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from 'src/prisma/prisma.service';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller('service')
export class ServiceController {
  constructor(
    private readonly serviceService: ServiceService,
    private configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async create(
    @Req() req: Request & { user: any },
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!body?.data) throw new BadRequestException('Body data is required');
    if (!file) throw new BadRequestException('File is required');

    let parsed: any;
    try {
      parsed = JSON.parse(body.data);
    } catch {
      throw new BadRequestException('Invalid JSON in body data');
    }

    // ✅ Convert to DTO and validate
    const dtoInstance = plainToInstance(CreateServiceDto, parsed);
    try {
      await validateOrReject(dtoInstance, {
        validationError: { target: false },
      });
    } catch (errors) {
      const formattedErrors = errors
        .map((err: any) => Object.values(err.constraints))
        .flat();
      throw new BadRequestException(formattedErrors); // Will now return 400 with messages
    }

    // Generate slug
    const slug = await generateUniqueSlug(
      dtoInstance.name,
      this.serviceService,
    );

    // Upload image
    const imageLink = await uploadFileToSupabase(
      file,
      this.configService,
      'service',
    );

    const adminId = req?.user?.id;
    const status = ServiceStatus.Active;

    const serviceData: any = {
      ...dtoInstance,
      slug,
      image: imageLink,
      adminId,
      status,
    };

    return await this.serviceService.create(serviceData);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Get('myself-services')
  getMyselfServices(
    @Req() req: Request & { user: any },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.serviceService.getMyselfServices(req?.user?.id, page, limit);
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('searchTerm') searchTerm?: string,
  ) {
    return this.serviceService.findAll(page, limit, searchTerm);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.serviceService.findBySlug(slug);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Patch('/update-service/:id')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async update(
    @Param('id') id: string,
    @Req() req: Request & { user: any },
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!body?.data && !file) {
      throw new BadRequestException(
        'At least one of data or file must be provided',
      );
    }

    let dtoInstance: any | null = null;

    // ✅ Handle data if exists
    if (body?.data) {
      let parsed: any;
      try {
        parsed = JSON.parse(body.data);
      } catch {
        throw new BadRequestException('Invalid JSON in body data');
      }

      dtoInstance = plainToInstance(UpdateServiceDto, parsed);

      try {
        await validateOrReject(dtoInstance, {
          validationError: { target: false },
        });
      } catch (errors) {
        const formattedErrors = errors
          .map((err: any) => Object.values(err.constraints))
          .flat();
        throw new BadRequestException(formattedErrors);
      }
    }

    const adminId = req?.user?.id;

    const updateData: any = {};

    // ✅ Update fields only if they exist
    if (dtoInstance) {
      if (dtoInstance.name) {
        updateData.name = dtoInstance.title;
        updateData.name = await generateUniqueSlug(
          dtoInstance.name,
          this.serviceService,
        );
      }

      if (dtoInstance.description)
        updateData.description = dtoInstance.description;
      if (dtoInstance.category) updateData.category = dtoInstance.category;
    }

    // ✅ Update file if exists
    if (file) {
      const imageLink = await uploadFileToSupabase(
        file,
        this.configService,
        'service',
      );
      updateData.image = imageLink;
    }

    return await this.serviceService.update(id, updateData);
  }

  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.serviceService.remove(slug);
  }
}
