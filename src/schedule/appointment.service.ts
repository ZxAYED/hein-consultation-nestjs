import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, SlotStatus, User, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto, userId: string) {
    if (!userId) {
      throw new ForbiddenException('Access denied');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.scheduleSlot.findUnique({
        where: { id: dto.slotId },
        select: {
          id: true,
          serviceName: true,
          startTime: true,
          status: true,
          appointmentId: true,
        },
      });

      if (!slot) {
        throw new NotFoundException('Slot not found');
      }

      if (slot.status === SlotStatus.Booked) {
        throw new ConflictException('Slot already booked');
      }

      if (slot.status === SlotStatus.Disabled) {
        throw new BadRequestException('Slot disabled');
      }

      const claimed = await tx.scheduleSlot.updateMany({
        where: {
          id: slot.id,
          status: SlotStatus.Available,
          appointmentId: null,
        },
        data: {
          status: SlotStatus.Booked,
        },
      });

      if (claimed.count !== 1) {
        throw new ConflictException('Slot already booked');
      }

      const appointment = await tx.appointment.create({
        data: {
          appointmentNo: this.generateAppointmentNo(),
          userId,
          serviceName: slot.serviceName,
          slotId: slot.id,
          scheduledAt: slot.startTime,
          meetingType: dto.meetingType,
          status: AppointmentStatus.Upcoming,
          note: dto.note ?? null,
        },
      });

      await tx.scheduleSlot.update({
        where: { id: slot.id },
        data: { appointmentId: appointment.id },
      });

      return appointment;
    });

    return sendResponse('Appointment created successfully', result);
  }

  async cancel(appointmentId: string, actor: Pick<User, 'id' | 'role'>) {
    if (!actor.id) {
      throw new ForbiddenException('Access denied');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          userId: true,
          slotId: true,
        },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      const isAdmin = actor.role === UserRole.ADMIN;
      if (!isAdmin && appointment.userId !== actor.id) {
        throw new ForbiddenException('Access denied');
      }

      const updatedAppointment = await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.Cancelled },
      });

      await tx.scheduleSlot.update({
        where: { id: appointment.slotId },
        data: { status: SlotStatus.Available, appointmentId: null },
      });

      return updatedAppointment;
    });

    return sendResponse('Appointment cancelled successfully', result);
  }

  private generateAppointmentNo() {
    return `APPT-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
