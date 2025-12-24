import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { ROLE } from 'src/user/entities/role.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GetInvoicesQueryDto } from './dto/get-invoices-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceService } from './invoice.service';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Post()
  create(
    @Body() body: any,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    const dto = plainToInstance(CreateInvoiceDto, body ?? {});
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length) {
      throw new BadRequestException(errors);
    }

    return this.invoiceService.create(dto, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Get()
  list(
    @Query() query: GetInvoicesQueryDto,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.invoiceService.list(query, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.invoiceService.getOne(id, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    const dto = plainToInstance(UpdateInvoiceDto, body ?? {});
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length) {
      throw new BadRequestException(errors);
    }

    return this.invoiceService.update(id, dto, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.invoiceService.remove(id, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Header('Content-Type', 'application/pdf')
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string; role: UserRole } },
    @Res() res: Response,
  ) {
    const invoice = await this.invoiceService.getInvoiceEntity(id, req.user);

    const invoiceNo = invoice?.invoiceNo || `invoice-${id}`;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoiceNo}.pdf"`,
    );

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text('Invoice', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Invoice No: ${invoice.invoiceNo}`);
    doc.text(`Status: ${invoice.status}`);
    doc.text(`Payment Type: ${invoice.paymentType}`);
    doc.text(
      `Issued At: ${new Date(invoice.issuedAt).toISOString().slice(0, 10)}`,
    );
    doc.text(
      `Due Date: ${new Date(invoice.dueDate).toISOString().slice(0, 10)}`,
    );
    doc.moveDown();

    const user = invoice.user;
    if (user) {
      doc.fontSize(14).text('Client', { underline: true });
      doc.fontSize(12).text(`${user.firstName} ${user.lastName}`);
      doc.text(user.email);
      doc.text(user.companyName);
      const addressParts = [
        user.street,
        user.city,
        user.zip,
        user.country,
      ].filter(Boolean);
      if (addressParts.length) {
        doc.text(addressParts.join(', '));
      }
      if (user.phoneNumber) {
        doc.text(user.phoneNumber);
      }
      doc.moveDown();
    }

    if (invoice.appointment) {
      doc.fontSize(14).text('Appointment', { underline: true });
      doc
        .fontSize(12)
        .text(`Appointment No: ${invoice.appointment.appointmentNo}`);
      doc.text(`Service: ${invoice.appointment.serviceName}`);
      doc.text(
        `Scheduled At: ${new Date(invoice.appointment.scheduledAt).toISOString()}`,
      );
      doc.moveDown();
    }

    doc.fontSize(14).text('Amount', { underline: true });
    doc.fontSize(24).text(`$${Number(invoice.amount).toFixed(2)}`);

    doc.end();
  }
}
