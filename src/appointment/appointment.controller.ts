import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { ROLE } from 'src/user/entities/role.entity';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { GetAppointmentsQueryDto } from './dto/get-appointments-query.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Post()
  create(
    @Body() dto: CreateAppointmentDto,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.appointmentService.create(dto, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Get()
  list(
    @Query() query: GetAppointmentsQueryDto,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.appointmentService.list(query, req.user);
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
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.appointmentService.update(id, dto, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.appointmentService.cancel(id, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Patch(':id/complete')
  complete(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.appointmentService.complete(id, req.user);
  }
}
