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
import { generateServiceSlug } from 'src/common/utils/generateUniqueSlug';
import { uploadFileToSupabase } from 'src/utils/common/uploadFileToSupabase';
import { ServiceStatus } from '@prisma/client';

import { ServiceService } from './service.service';

import { sendResponse } from 'src/utils/sendResponse';
import { plainToInstance } from 'class-transformer';
import { CreateServiceDto } from './dto/create-service.dto';
import { validateOrReject } from 'class-validator';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller('service')
export class ServiceController {
  constructor(
    private readonly serviceService: ServiceService,
    private configService: ConfigService,
  ) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('searchTerm') searchTerm?: string,
    @Query('category') category?: string,
  ) {
    return this.serviceService.findAll(page, limit, searchTerm, category);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.serviceService.findOne(slug);
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Req() req: Request & { user: any },
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!body?.data) {
      throw new BadRequestException('Body data is required');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(body.data);
    } catch {
      throw new BadRequestException('Invalid JSON in body data');
    }
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

    // console.log(dtoInstance);

    const imageLink = await uploadFileToSupabase(
      file,
      this.configService,
      'service-uploads',
    );
    const slug = await generateServiceSlug(
      dtoInstance.name,
      this.serviceService,
    );

    const serviceData = {
      ...dtoInstance,
      image: imageLink,
      slug,
      status: ServiceStatus.Active,
      adminId: req.user.id as string,
    };

    // console.log({serviceData})

    const result = await this.serviceService.create(serviceData);
    return sendResponse('Service Created Successfully', result);
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

    let dtoInstance: UpdateServiceDto | null = null;

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

    const updateData: any = {};

    // ✅ Update fields only if they exist
    if (dtoInstance) {
      if (dtoInstance.name) {
        updateData.slug = await generateServiceSlug(
          dtoInstance.name,
          this.serviceService,
        );
      }

      if (dtoInstance.description)
        updateData.description = dtoInstance.description;
      if (dtoInstance.category) updateData.category = dtoInstance.category;
      if (dtoInstance.name) updateData.name = dtoInstance.name;
    }

    // ✅ Update file if exists
    if (file) {
      const imageLink = await uploadFileToSupabase(
        file,
        this.configService,
        'blog',
      );
      updateData.image = imageLink;
    }

    return await this.serviceService.update(id, updateData);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.serviceService.remove(slug);
  }
}
