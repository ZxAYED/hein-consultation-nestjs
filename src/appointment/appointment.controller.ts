/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Request } from 'express';
import multer from 'multer';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { ROLE } from 'src/user/entities/role.entity';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER)
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, { storage: multer.memoryStorage() }),
  )
  async create(
    @Req() req: Request & { user: any },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const rawBody: any = req.body ?? {};
    let parsed: any = rawBody;

    if (typeof rawBody?.data === 'string' && rawBody.data.trim().length) {
      try {
        const json = JSON.parse(rawBody.data);
        parsed = { ...rawBody, ...json };
      } catch {
        throw new BadRequestException('Invalid JSON in data field');
      }
    }

    const dtoObject = { ...parsed, userId: req.user.id };
    delete (dtoObject as any).data;

    const dto = plainToInstance(CreateAppointmentDto, dtoObject);

    console.log(dtoObject);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length) {
      throw new BadRequestException(errors);
    }

    dto.userId = req.user.id as string;
    // console.log(dto)

    return this.appointmentService.create(dto, files ?? []);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Get()
  list(
    @Query() query: { page?: string | number; limit?: string | number , serviceName?: string , status?: string, meetingType?: string, slotId?: string, appointmentNo?: string, userId?: string },
    
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    const page =
      query.page !== undefined ? Math.max(1, Number(query.page)) : undefined;
    const limit =
      query.limit !== undefined ? Math.max(1, Number(query.limit)) : undefined;
    return this.appointmentService.list({ page, limit, serviceName: query.serviceName , status: query.status, meetingType: query.meetingType, slotId: query.slotId, appointmentNo: query.appointmentNo, userId: query.userId}, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Get('all')
  listAll(@Req() req: Request & { user: { id: string; role: UserRole } }) {
    return this.appointmentService.listAll(req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.appointmentService.getOne(id, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Patch(':id')
  action(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.appointmentService.action(id, dto, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Get(':id/attachments')
  attachments(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.appointmentService.listAttachments(id, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, { storage: multer.memoryStorage() }),
  )
  addAttachments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.appointmentService.addAttachments(id, files ?? [], req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Delete(':id/attachments')
  removeAttachments(
    @Param('id') id: string,
    @Body() body: { fileUrls: string[] },
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    if (!Array.isArray(body?.fileUrls) || body.fileUrls.length === 0) {
      throw new BadRequestException('fileUrls must be a non-empty array');
    }
    return this.appointmentService.removeAttachments(
      id,
      body.fileUrls,
      req.user,
    );
  }
}
