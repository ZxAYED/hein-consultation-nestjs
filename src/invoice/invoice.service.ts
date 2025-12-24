import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma, User, UserRole } from '@prisma/client';
import { getPagination } from 'src/common/utils/pagination';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GetInvoicesQueryDto } from './dto/get-invoices-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInvoiceDto, actor: Pick<User, 'id' | 'role'>) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      select: { id: true, userId: true, status: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status === AppointmentStatus.Cancelled) {
      throw new BadRequestException(
        'Cancelled appointments cannot be invoiced',
      );
    }

    const issuedAt = this.parseDateOrNow(dto.issuedAt);
    const dueDate = this.parseDate(dto.dueDate, 'dueDate');

    const created = await this.prisma.$transaction(async (tx) => {
      const exists = await tx.invoice.findFirst({
        where: { appointmentId: appointment.id },
        select: { id: true },
      });

      if (exists) {
        throw new ConflictException(
          'Invoice already exists for this appointment',
        );
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNo: dto.invoiceNo?.trim() || this.generateInvoiceNo(),
          userId: appointment.userId,
          appointmentId: appointment.id,
          amount: dto.amount,
          status: dto.status,
          paymentType: dto.paymentType,
          issuedAt,
          dueDate,
        },
      });

      if (appointment.status !== AppointmentStatus.Completed) {
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: AppointmentStatus.Completed },
        });
      }

      return invoice;
    });

    return sendResponse('Invoice created successfully', created);
  }

  async list(query: GetInvoicesQueryDto, actor: Pick<User, 'id' | 'role'>) {
    const isAdmin = actor.role === UserRole.ADMIN;
    const where: Prisma.InvoiceWhereInput = isAdmin ? {} : { userId: actor.id };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { invoiceNo: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const createdAt = this.buildCreatedAtRange(query.fromDate, query.toDate);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const totalItems = await this.prisma.invoice.count({ where });
    const { skip, take, meta } = getPagination(
      query.page,
      query.limit,
      totalItems,
    );

    const data = await this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentNo: true,
            serviceName: true,
            scheduledAt: true,
          },
        },
      },
    });

    return sendResponse('Invoices retrieved successfully', { data, meta });
  }

  async getOne(id: string, actor: Pick<User, 'id' | 'role'>) {
    const invoice = await this.getInvoiceEntity(id, actor);
    return sendResponse('Invoice retrieved successfully', invoice);
  }

  async getInvoiceEntity(id: string, actor: Pick<User, 'id' | 'role'>) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
            street: true,
            city: true,
            zip: true,
            country: true,
            phoneNumber: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentNo: true,
            serviceName: true,
            scheduledAt: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const isAdmin = actor.role === UserRole.ADMIN;
    if (!isAdmin && invoice.userId !== actor.id) {
      throw new ForbiddenException('Access denied');
    }

    return invoice;
  }

  async update(
    id: string,
    dto: UpdateInvoiceDto,
    actor: Pick<User, 'id' | 'role'>,
  ) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const hasUpdates = Object.values(dto).some((value) => value !== undefined);
    if (!hasUpdates) {
      throw new BadRequestException('No update fields provided');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const issuedAt = dto.issuedAt
      ? this.parseDate(dto.issuedAt, 'issuedAt')
      : undefined;
    const dueDate = dto.dueDate
      ? this.parseDate(dto.dueDate, 'dueDate')
      : undefined;

    const updated = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        invoiceNo: dto.invoiceNo?.trim() || undefined,
        amount: dto.amount ?? undefined,
        status: dto.status ?? undefined,
        paymentType: dto.paymentType ?? undefined,
        issuedAt,
        dueDate,
      },
    });

    return sendResponse('Invoice updated successfully', updated);
  }

  async remove(id: string, actor: Pick<User, 'id' | 'role'>) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    await this.prisma.invoice.delete({ where: { id: invoice.id } });
    return sendResponse('Invoice deleted successfully');
  }

  private generateInvoiceNo() {
    return `INV-${Date.now()}`;
  }

  private parseDateOrNow(value?: string) {
    if (typeof value !== 'string' || !value.trim()) {
      return new Date();
    }
    return this.parseDate(value, 'issuedAt');
  }

  private parseDate(value: string, fieldName: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }
    return date;
  }

  private buildCreatedAtRange(
    fromDate?: string,
    toDate?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!fromDate && !toDate) return undefined;

    const range: Prisma.DateTimeFilter = {};
    if (fromDate) {
      range.gte = this.parseDate(fromDate, 'fromDate');
    }
    if (toDate) {
      range.lte = this.parseDate(toDate, 'toDate');
    }
    return range;
  }
}
