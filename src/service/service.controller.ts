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
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { ROLE } from 'src/user/entities/role.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import {
  generateServiceSlug,
  generateUniqueSlug,
} from 'src/common/utils/generateUniqueSlug';
import { uploadFileToSupabase } from 'src/utils/common/uploadFileToSupabase';
import { ServiceStatus } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';
import { ServiceService } from './service.service';

import { sendResponse } from 'src/utils/sendResponse';
import { plainToInstance } from 'class-transformer';
import { CreateServiceDto } from './dto/create-service.dto';
import { validateOrReject } from 'class-validator';

@Controller('service')
export class ServiceController {
  constructor(
    private readonly serviceService: ServiceService,
    private configService: ConfigService,
    private readonly prisma: PrismaService,
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

  @Post()
  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Req() req: Request & { user: any },
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log(body.data);
    console.log(file);

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
}
