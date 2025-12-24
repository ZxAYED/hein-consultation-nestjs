import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User, UserRole } from '@prisma/client';
import { getPagination } from 'src/common/utils/pagination';
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
    const where: Prisma.DocumentWhereInput = {};

    // If the user is not an admin, fetch only their documents
    if (!isAdmin) {
      where.userId = actor.id;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.appointmentId) {
      where.appointmentId = query.appointmentId;
    }

    if (query.invoiceId) {
      where.invoiceId = query.invoiceId;
    }

    if (query.appointmentNo) {
      where.appointment = { appointmentNo: query.appointmentNo };
    }

    if (query.invoiceNo) {
      where.invoice = { invoiceNo: query.invoiceNo };
    }

    const tagFilters = new Set<string>();
    if (query.tag) {
      tagFilters.add(query.tag);
    }
    if (Array.isArray(query.tags)) {
      query.tags.forEach((tag) => tagFilters.add(tag));
    }
    if (tagFilters.size) {
      where.tags = { hasSome: Array.from(tagFilters) };
    }

    // Full-text search in name or description fields
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

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
          select: { invoiceNo: true, amount: true, id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return sendResponse('Documents retrieved successfully', { data, meta });
  }

  async update(id: string, dto: UpdateDocumentDto) {
    const hasUpdates = Object.values(dto).some((value) => value !== undefined);
    if (!hasUpdates) {
      throw new BadRequestException('No update fields provided');
    }

    try {
      const document = await this.prisma.document.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const appointmentId = await this.resolveAppointmentId(dto.appointmentId);
      const invoiceId = await this.resolveInvoiceId(dto.invoiceId);

      const updated = await this.prisma.document.update({
        where: { id: document.id },
        data: {
          appointmentId: appointmentId,
          invoiceId: invoiceId,
          name: dto.name,
          type: dto.type,
          status: dto.status,
          tags: dto.tags,
          description: dto.description,
        },
      });

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

  async remove(id: string) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id },
        select: { id: true, userId: true, fileUrls: true },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
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

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        OR: [{ id: reference }, { appointmentNo: reference }],
      },
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
    parts.shift(); // drop bucket name
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
