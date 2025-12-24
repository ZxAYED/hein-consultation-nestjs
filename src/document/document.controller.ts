import { PrismaService } from './../prisma/prisma.service';
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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { DocumentStatus, UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Request } from 'express';
import multer from 'multer';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { ROLE } from 'src/user/entities/role.entity';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { GetDocumentsQueryDto } from './dto/get-documents-query.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { uploadFileToSupabase } from 'src/utils/common/uploadFileToSupabase';
import { ConfigService } from '@nestjs/config';

@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      // 10 = max file limit
      storage: multer.memoryStorage(),
    }),
  )
  async create(
    @Req() req: Request & { user: any },
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!body?.data) throw new BadRequestException('Body data is required');
    if (!files || files.length === 0)
      throw new BadRequestException('At least one file is required');

    let parsed: any;
    try {
      parsed = JSON.parse(body.data);
    } catch {
      throw new BadRequestException('Invalid JSON in body data');
    }

    // upload all files
    const fileLinks = await Promise.all(
      files.map((file) =>
        uploadFileToSupabase(file, this.configService, 'blog'),
      ),
    );


    const userId = req.user.id;
    // 🔐 1️⃣ Invoice validate (exist + ownership)

    if (parsed.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          id: parsed.invoiceId,
          userId,
        },
      });

      if (!invoice) {
        throw new BadRequestException(
          'Invoice not found or does not belong to this user',
        );
      }
    }

    // 🔐 2️⃣ Appointment validate (exist + ownership)
    if (parsed.appointmentId) {
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          id: parsed.appointmentId,
          userId,
        },
      });

      if (!appointment) {
        throw new BadRequestException(
          'Appointment not found or does not belong to this user',
        );
      }
    }

    // 🧱 3️⃣ Base document data
    const documentData: any = {
      name: parsed.name,
      type: parsed.type,
      status: DocumentStatus.Open,
      fileUrls: fileLinks,
      tags: parsed.tags ?? [],
      description: parsed.description ?? null,

      user: {
        connect: { id: req.user.id },
      },
    };

    // 🔗 4️⃣ Optional relations
    if (parsed.invoiceId) {
      documentData.invoice = {
        connect: { id: parsed.invoiceId },
      };
    }

    if (parsed.appointmentId) {
      documentData.appointment = {
        connect: { id: parsed.appointmentId },
      };
    }

    // 💾 5️⃣ Create document
    const document = await this.prisma.document.create({
      data: documentData,
    });

    return document;
  }
}
