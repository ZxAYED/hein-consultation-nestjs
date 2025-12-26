/* eslint-disable @typescript-eslint/restrict-template-expressions */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppointmentStatus,
  MeetingType,
  NotificationEvent,
  Prisma,
  SlotStatus,
  User,
  UserRole,
} from '@prisma/client';
import { getPagination } from 'src/common/utils/pagination';
import { EventService } from 'src/event/event.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { deleteFilesFromSupabase } from 'src/utils/common/deleteFilesFromSupabase';
import { uploadFileToSupabaseWithMeta } from 'src/utils/common/uploadFileToSupabase';
import { sendResponse } from 'src/utils/sendResponse';
import {
  CreateAppointmentDto,
  ServiceNames,
} from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

type AppointmentAttachment = {
  fileName: string;
  fileUrl: string;
  filePath: string;
};

type StoredAppointmentAttachment = {
  fileName: string;
  fileUrl: string;
  filePath?: string;
};

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventService: EventService,
  ) {}

  async create(dto: CreateAppointmentDto, files: Express.Multer.File[] = []) {
    const attachments = await this.uploadAttachments(files);

    if (!Object.values(ServiceNames).includes(dto.serviceName)) {
      throw new BadRequestException(
        `serviceName ${dto.serviceName} is not valid should be one of ${Object.values(ServiceNames).join(', ')}`,
      );
    }
    if (dto.meetingType === MeetingType.InPerson && !dto.note) {
      throw new BadRequestException(
        'Additional note is required for in-person meeting',
      );
    }
    if (
      !(
        dto.meetingType === MeetingType.InPerson ||
        dto.meetingType === MeetingType.Virtual ||
        dto.meetingType === MeetingType.Phone
      )
    ) {
      throw new BadRequestException(
        `meetingType ${dto.meetingType} is not valid. It should be one of ${Object.values(MeetingType).join(', ')}`,
      );
    }
    const result = await this.prisma
      .$transaction(async (tx) => {
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
            appointmentNo: this.generateAppointmentNo() ?? '',
            userId: user.id,
            serviceName: slot.serviceName,
            slotId: slot.id,
            scheduledAt: slot.startTime,
            meetingType: dto.meetingType,
            status: AppointmentStatus.Upcoming,
            note: dto.note ?? null,
            attachments: attachments.map((file) => ({
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              filePath: file.filePath,
            })),
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
      })
      .catch(async (error) => {
        await this.cleanupUploadedFiles(attachments);
        throw error;
      });

    await this.eventService.emitSystemEvent({
      event: NotificationEvent.APPOINTMENT_CREATED,
      entityId: result.id,
      actorId: dto.userId,
      actorRole: UserRole.CUSTOMER,
      userId: dto.userId,
      metadata: { appointmentId: result.id, status: result.status },
    });

    return sendResponse('Appointment created successfully', result);
  }

  async listAttachments(
    appointmentId: string,
    actor: Pick<User, 'id' | 'role'>,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, userId: true, attachments: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const isAdmin = actor.role === UserRole.ADMIN;
    if (!isAdmin && appointment.userId !== actor.id) {
      throw new ForbiddenException('Access denied');
    }

    const attachments = Array.isArray(appointment.attachments)
      ? (appointment.attachments as StoredAppointmentAttachment[])
      : [];

    return sendResponse('Attachments retrieved successfully', attachments);
  }

  async addAttachments(
    appointmentId: string,
    files: Express.Multer.File[],
    actor: Pick<User, 'id' | 'role'>,
  ) {
    if (!files?.length) {
      throw new BadRequestException('No files provided');
    }

    const uploaded = await this.uploadAttachments(files);

    const result = await this.prisma
      .$transaction(async (tx) => {
        const appointment = await tx.appointment.findUnique({
          where: { id: appointmentId },
          select: { id: true, userId: true, attachments: true },
        });

        if (!appointment) {
          throw new NotFoundException('Appointment not found');
        }

        const isAdmin = actor.role === UserRole.ADMIN;
        if (!isAdmin && appointment.userId !== actor.id) {
          throw new ForbiddenException('Access denied');
        }

        const existing = Array.isArray(appointment.attachments)
          ? (appointment.attachments as StoredAppointmentAttachment[])
          : [];

        const next = [
          ...existing,
          ...uploaded.map((f) => ({
            fileName: f.fileName,
            fileUrl: f.fileUrl,
            filePath: f.filePath,
          })),
        ];

        return tx.appointment.update({
          where: { id: appointment.id },
          data: { attachments: next },
          select: { id: true, attachments: true },
        });
      })
      .catch(async (error) => {
        await this.cleanupUploadedFiles(uploaded);
        throw error;
      });

    return sendResponse('Attachments added successfully', result);
  }

  async removeAttachments(
    appointmentId: string,
    fileUrls: string[],
    actor: Pick<User, 'id' | 'role'>,
  ) {
    const uniqueUrls = [...new Set(fileUrls)].filter(
      (u) => typeof u === 'string' && u.trim().length > 0,
    );
    if (uniqueUrls.length === 0) {
      throw new BadRequestException('fileUrls must be a non-empty array');
    }

    const { updated, removedPaths } = await this.prisma.$transaction(
      async (tx) => {
        const appointment = await tx.appointment.findUnique({
          where: { id: appointmentId },
          select: { id: true, userId: true, attachments: true },
        });

        if (!appointment) {
          throw new NotFoundException('Appointment not found');
        }

        const isAdmin = actor.role === UserRole.ADMIN;
        if (!isAdmin && appointment.userId !== actor.id) {
          throw new ForbiddenException('Access denied');
        }

        const existing = Array.isArray(appointment.attachments)
          ? (appointment.attachments as StoredAppointmentAttachment[])
          : [];

        const removed = existing.filter((a) => uniqueUrls.includes(a.fileUrl));
        const next = existing.filter((a) => !uniqueUrls.includes(a.fileUrl));

        const updated = await tx.appointment.update({
          where: { id: appointment.id },
          data: { attachments: next },
          select: { id: true, attachments: true },
        });

        const removedPaths = removed
          .map((a) => a.filePath)
          .filter((p): p is string => typeof p === 'string' && p.length > 0);

        return { updated, removedPaths };
      },
    );

    await this.cleanupUploadedFiles(
      removedPaths.map((p) => ({ filePath: p, fileName: '', fileUrl: '' })),
    );

    return sendResponse('Attachments removed successfully', updated);
  }

  async list(
    query: {
      page?: number;
      limit?: number;
      serviceName?: string;
      status?: string;
      meetingType?: string;
      slotId?: string;
      appointmentNo?: string;
      userId?: string;
    },
    actor: Pick<User, 'id' | 'role'>,
  ) {
    console.log('🚀 ~ AppointmentService ~ list ~ query:', query);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const isAdmin = actor.role === UserRole.ADMIN;

    const where: Prisma.AppointmentWhereInput = {};

    if (!isAdmin) {
      where.userId = actor.id;
    }

    if (query.serviceName) {
      where.serviceName = query.serviceName;
    }

    if (query.status) {
      where.status = query.status as AppointmentStatus;
    }
    if (query.meetingType) {
      where.meetingType = query.meetingType as MeetingType;
    }
    if (query.slotId) {
      where.slotId = query.slotId;
    }
    if (query.appointmentNo) {
      where.appointmentNo = query.appointmentNo;
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    // মোট অ্যাপয়েন্টমেন্টের সংখ্যা
    const totalItems = await this.prisma.appointment.count({ where });

    // Pagination calculate
    const { skip, take, meta } = getPagination(page, limit, totalItems);

    // ডেটা fetch
    const data = await this.prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      skip,
      take,
      include: {
        slot: {
          select: { startTime: true, endTime: true, status: true },
        },
      },
    });

    return sendResponse('Appointments retrieved successfully', { data, meta });
  }

  async listAll(actor: Pick<User, 'id' | 'role'>) {
    const isAdmin = actor.role === UserRole.ADMIN;
    const where: Prisma.AppointmentWhereInput = isAdmin
      ? {}
      : { userId: actor.id };

    const data = await this.prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: {
        slot: {
          select: { startTime: true, endTime: true, status: true },
        },
      },
    });

    return sendResponse('Appointments retrieved successfully', data);
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

  async action(
    appointmentId: string,
    dto: UpdateAppointmentDto,
    actor: Pick<User, 'id' | 'role'>,
  ) {
    if (dto.action === 'cancel') {
      return this.cancel(appointmentId, actor);
    }

    if (dto.action === 'complete') {
      return this.complete(appointmentId, actor);
    }

    if (!dto.meetingType && !dto.note) {
      throw new BadRequestException('No update fields provided');
    }

    const updated = await this.update(
      appointmentId,
      { action: 'update', meetingType: dto.meetingType, note: dto.note },
      actor,
    );

    return sendResponse('Appointment updated successfully', updated);
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

    await this.eventService.emitSystemEvent({
      event: NotificationEvent.APPOINTMENT_STATUS_CHANGED,
      entityId: result.id,
      actorId: actor.id,
      actorRole: actor.role,
      userId: result.userId,
      metadata: { status: result.status },
    });

    return sendResponse('Appointment cancelled successfully', result);
  }

  async complete(appointmentId: string, actor: Pick<User, 'id' | 'role'>) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, status: true, userId: true },
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

    await this.eventService.emitSystemEvent({
      event: NotificationEvent.APPOINTMENT_STATUS_CHANGED,
      entityId: updated.id,
      actorId: actor.id,
      actorRole: actor.role,
      userId: updated.userId,
      metadata: { status: updated.status },
    });

    return sendResponse('Appointment completed successfully', updated);
  }

  private generateAppointmentNo() {
    return `APPT-${Date.now()}`;
  }

  private parseDayStart(dateStr: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!match) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return date;
  }

  private parseDayEnd(dateStr: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!match) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return date;
  }

  private async uploadAttachments(files: Express.Multer.File[]) {
    if (!files?.length) {
      return [] as AppointmentAttachment[];
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const { fileUrl, filePath, fileName, originalName } =
          await uploadFileToSupabaseWithMeta(
            file,
            this.configService,
            'appointment-uploads',
          );

        return { fileUrl, filePath, fileName: originalName || fileName };
      }),
    );

    return uploads;
  }

  private async cleanupUploadedFiles(uploads: AppointmentAttachment[]) {
    const paths = uploads.map((item) => item.filePath).filter(Boolean);

    if (!paths.length) return;

    try {
      await deleteFilesFromSupabase(paths, this.configService);
    } catch (error) {
      // Keep cleanup failures from masking the original error
      console.error('Failed to cleanup uploaded appointment files', error);
    }
  }
}
