import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentStatus,
  NotificationEvent,
  Prisma,
  User,
  UserRole,
} from '@prisma/client';
import { getPagination } from 'src/common/utils/pagination';
import { EventService } from 'src/event/event.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { deleteFilesFromSupabase } from 'src/utils/common/deleteFilesFromSupabase';
import { sendResponse } from 'src/utils/sendResponse';
import { CreateDocumentDto } from './dto/create-document.dto';
import { GetDocumentsQueryDto } from './dto/get-documents-query.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventService: EventService,
  ) {}

  async create(
    dto: CreateDocumentDto,
    payload: { fileUrls: string[]; format: string | null; size: number },
    actor: Pick<User, 'id'>,
  ) {
    try {
      const appointmentRef = dto.appointmentId;
      const invoiceRef = dto.invoiceId;

      const appointmentId = await this.resolveAppointmentId(appointmentRef);
      const invoiceId = await this.resolveInvoiceId(invoiceRef);

      const created = await this.prisma.document.create({
        data: {
          name: dto.name,
          type: dto.type,
          status: 'Open',
          format: payload.format ?? undefined,
          size: payload.size,
          fileUrls: payload.fileUrls,
          tags: dto.tags ?? [],
          description: dto.description ?? null,
          user: { connect: { id: actor.id } },
          ...(appointmentId && {
            appointment: { connect: { id: appointmentId } },
          }),
          ...(invoiceId && {
            invoice: { connect: { id: invoiceId } },
          }),
        },
      });

      await this.eventService.emitSystemEvent({
        event: NotificationEvent.DOCUMENT_UPLOADED,
        entityId: created.id,
        actorId: actor.id,
        actorRole: UserRole.CUSTOMER,
        userId: actor.id,
        metadata: { documentId: created.id, status: created.status },
      });

      return sendResponse('Document created successfully', created);
    } catch (error) {
      console.error('DocumentService.create failed', error);
      await this.cleanupUploadedFiles(payload.fileUrls);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Document creation failed');
    }
  }

  async list(query: GetDocumentsQueryDto, actor: Pick<User, 'id' | 'role'>) {
    const isAdmin = actor.role === UserRole.ADMIN;

    const andConditions: Prisma.DocumentWhereInput[] = [];

    if (!isAdmin) {
      andConditions.push({ userId: actor.id });
    }

    if (query.type) {
      andConditions.push({ type: query.type });
    }

    if (query.status) {
      andConditions.push({ status: query.status });
    }

    if (query.appointmentId) {
      andConditions.push({ appointmentId: query.appointmentId });
    }

    if (query.invoiceId) {
      andConditions.push({ invoiceId: query.invoiceId });
    }

    if (query.appointmentNo) {
      andConditions.push({
        appointment: {
          appointmentNo: query.appointmentNo,
        },
      });
    }

    if (query.invoiceNo) {
      andConditions.push({
        invoice: {
          invoiceNo: query.invoiceNo,
        },
      });
    }

    const tagFilters = new Set<string>();
    if (query.tag) {
      tagFilters.add(query.tag);
    }
    if (Array.isArray(query.tags)) {
      query.tags.forEach((tag) => tagFilters.add(tag));
    }
    if (tagFilters.size) {
      andConditions.push({
        tags: {
          hasSome: Array.from(tagFilters),
        },
      });
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.DocumentWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const totalItems = await this.prisma.document.count({ where });
    const { skip, take, meta } = getPagination(
      query.page,
      query.limit,
      totalItems,
    );

    const data = await this.prisma.document.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        format: true,
        size: true,
        fileUrls: true,
        tags: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        appointment: {
          select: {
            appointmentNo: true,
            serviceName: true,
            id: true,
          },
        },
        invoice: {
          select: {
            invoiceNo: true,
            amount: true,
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return sendResponse('Documents retrieved successfully', {
      data,
      meta,
    });
  }

  async update(
    id: string,
    dto: UpdateDocumentDto,
    actor: Pick<User, 'id' | 'role'>,
  ) {
    const hasUpdates = Object.values(dto).some((value) => value !== undefined);
    if (!hasUpdates) {
      throw new BadRequestException('No update fields provided');
    }

    try {
      const document = await this.prisma.document.findUnique({
        where: { id },
        select: { id: true, userId: true, status: true },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const isAdmin = actor.role === UserRole.ADMIN;
      if (!isAdmin && document.userId !== actor.id) {
        throw new ForbiddenException('Access denied');
      }

      const appointmentId = await this.resolveAppointmentId(dto.appointmentId);
      const invoiceRef = dto.invoiceId ?? dto.invoiceNo;
      const invoiceId = await this.resolveInvoiceId(invoiceRef);

      const updated = await this.prisma.document.update({
        where: { id: document.id },
        data: {
          appointmentId: appointmentId ?? undefined,
          invoiceId: invoiceId ?? undefined,
          name: dto.name ?? undefined,
          type: dto.type ?? undefined,
          status: dto.status ?? undefined,
          format: dto.format ?? undefined,
          size: dto.size ?? undefined,
          tags: dto.tags ?? undefined,
          description: dto.description ?? undefined,
        },
      });

      const shouldEmitApproved =
        dto.status === DocumentStatus.Approved &&
        document.status !== DocumentStatus.Approved;
      if (shouldEmitApproved) {
        await this.eventService.emitSystemEvent({
          event: NotificationEvent.DOCUMENT_APPROVED,
          entityId: document.id,
          actorId: actor.id,
          actorRole: actor.role,
          userId: document.userId,
          metadata: { status: dto.status },
        });
      }

      return sendResponse('Document updated successfully', updated);
    } catch (error) {
      console.error('DocumentService.update failed', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Document update failed');
    }
  }

  async remove(id: string, actor: Pick<User, 'id' | 'role'>) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id },
        select: { id: true, userId: true, fileUrls: true },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const isAdmin = actor.role === UserRole.ADMIN;
      if (!isAdmin && document.userId !== actor.id) {
        throw new ForbiddenException('Access denied');
      }

      await this.cleanupUploadedFiles(document.fileUrls ?? []);
      await this.prisma.document.delete({ where: { id: document.id } });

      return sendResponse('Document deleted successfully');
    } catch (error) {
      console.error('DocumentService.remove failed', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Document delete failed');
    }
  }

  private async resolveAppointmentId(reference?: string) {
    if (typeof reference !== 'string' || !reference.trim()) {
      return undefined;
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: reference },
      select: { id: true },
    });

    if (!appointment) {
      throw new BadRequestException('Appointment not found');
    }

    return appointment.id;
  }

  private async resolveInvoiceId(reference?: string) {
    if (typeof reference !== 'string' || !reference.trim()) {
      return undefined;
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        OR: [{ id: reference }, { invoiceNo: reference }],
      },
      select: { id: true },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    return invoice.id;
  }

  private extractSupabasePath(fileUrl: string) {
    if (!fileUrl) return null;
    const marker = '/storage/v1/object/public/';
    const idx = fileUrl.indexOf(marker);
    if (idx === -1) return null;
    const path = decodeURIComponent(
      fileUrl.slice(idx + marker.length).split('?')[0],
    );
    const parts = path.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    parts.shift();
    return parts.join('/');
  }

  private async cleanupUploadedFiles(fileUrls: string[]) {
    const filePaths = fileUrls
      .map((fileUrl) => this.extractSupabasePath(fileUrl))
      .filter(
        (path): path is string => typeof path === 'string' && path.length > 0,
      );

    const uniquePaths = Array.from(new Set(filePaths));
    if (!uniquePaths.length) return;

    await deleteFilesFromSupabase(uniquePaths, this.configService);
  }
}
