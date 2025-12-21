import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
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
    return this.appointmentService.create(dto, req.user.id);
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
}
