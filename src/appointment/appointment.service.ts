import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  Prisma,
  SlotStatus,
  User,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { GetAppointmentsQueryDto } from './dto/get-appointments-query.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto, actor: Pick<User, 'id' | 'role'>) {
    if (!actor.id) {
      throw new ForbiddenException('Access denied');
    }

    const isAdmin = actor.role === UserRole.ADMIN;
    if (!isAdmin && dto.userId !== actor.id) {
      throw new ForbiddenException('Access denied');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, isBlocked: true, isDeleted: true },
      });

      if (!user || user.isDeleted) {
        throw new NotFoundException('User not found');
      }

      if (user.isBlocked) {
        throw new ForbiddenException('User is blocked');
      }

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

      if (dto.serviceName !== slot.serviceName) {
        throw new BadRequestException('serviceName does not match slot');
      }

      if (slot.status === SlotStatus.Disabled) {
        throw new BadRequestException('Slot disabled');
      }

      if (slot.status !== SlotStatus.Available) {
        throw new ConflictException('Slot already booked');
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
          userId: user.id,
          serviceName: slot.serviceName,
          slotId: slot.id,
          scheduledAt: slot.startTime,
          meetingType: dto.meetingType,
          status: AppointmentStatus.Upcoming,
          note: dto.note ?? null,
        },
        include: {
          slot: {
            select: { startTime: true, endTime: true, status: true },
          },
        },
      });

      await tx.scheduleSlot.update({
        where: { id: slot.id },
        data: { appointmentId: appointment.id, status: SlotStatus.Booked },
      });

      return appointment;
    });

    return sendResponse('Appointment created successfully', result);
  }

  async list(query: GetAppointmentsQueryDto, actor: Pick<User, 'id' | 'role'>) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const isAdmin = actor.role === UserRole.ADMIN;

    const where: Prisma.AppointmentWhereInput = {};
    if (!isAdmin) {
      where.userId = actor.id;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.serviceName) {
      where.serviceName = query.serviceName;
    }
    if (query.fromDate || query.toDate) {
      const range: Prisma.DateTimeFilter = {};
      if (query.fromDate) {
        range.gte = this.parseDayStart(query.fromDate);
      }
      if (query.toDate) {
        range.lte = this.parseDayEnd(query.toDate);
      }
      where.scheduledAt = range;
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
        include: {
          slot: {
            select: { startTime: true, endTime: true, status: true },
          },
        },
      }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async getOne(id: string, actor: Pick<User, 'id' | 'role'>) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        slot: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const isAdmin = actor.role === UserRole.ADMIN;
    if (!isAdmin && appointment.userId !== actor.id) {
      throw new ForbiddenException('Access denied');
    }

    return appointment;
  }

  async update(
    appointmentId: string,
    dto: UpdateAppointmentDto,
    actor: Pick<User, 'id' | 'role'>,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, userId: true, status: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== AppointmentStatus.Upcoming) {
      throw new BadRequestException(
        'Only upcoming appointments can be updated',
      );
    }

    const isAdmin = actor.role === UserRole.ADMIN;
    if (!isAdmin && appointment.userId !== actor.id) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        meetingType: dto.meetingType ?? undefined,
        note: dto.note ?? undefined,
      },
      include: {
        slot: {
          select: { startTime: true, endTime: true, status: true },
        },
      },
    });

    return updated;
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
          status: true,
        },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      if (appointment.status !== AppointmentStatus.Upcoming) {
        throw new BadRequestException(
          'Only upcoming appointments can be cancelled',
        );
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

  async complete(appointmentId: string, actor: Pick<User, 'id' | 'role'>) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, status: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== AppointmentStatus.Upcoming) {
      throw new BadRequestException(
        'Only upcoming appointments can be completed',
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: AppointmentStatus.Completed },
    });

    return sendResponse('Appointment completed successfully', updated);
  }

  private generateAppointmentNo() {
    return `APPT-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private parseDayStart(dateStr: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!match) {
      throw new BadRequestException('Invalid date');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  private parseDayEnd(dateStr: string) {
    const start = this.parseDayStart(dateStr);
    return new Date(start.getTime() + 24 * 60 * 60_000 - 1);
  }
}
