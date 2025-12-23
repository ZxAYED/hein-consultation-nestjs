import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User, UserRole } from '@prisma/client';
import path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import { deleteFilesFromSupabase } from 'src/utils/common/deleteFilesFromSupabase';
import { uploadFileToSupabaseWithMeta } from 'src/utils/common/uploadFileToSupabase';
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

async create(data: any) {
  return this.prisma.document.create({ data });
}

  // async list(query: GetDocumentsQueryDto, actor: Pick<User, 'id' | 'role'>) {
  //   const page = Number(query.page) || 1;
  //   const limit = Number(query.limit) || 10;
  //   const skip = (page - 1) * limit;
  //   const isAdmin = actor.role === UserRole.ADMIN;

  //   const where: Prisma.DocumentWhereInput = {};
  //   if (!isAdmin) {
  //     where.userId = actor.id;
  //   } else if (query.userId) {
  //     where.userId = query.userId;
  //   }

  //   if (query.type) {
  //     where.type = query.type;
  //   }

  //   if (query.status) {
  //     where.status = query.status;
  //   }

  //   if (query.appointmentId) {
  //     where.appointmentId = query.appointmentId;
  //   }

  //   if (query.invoiceId) {
  //     where.invoiceId = query.invoiceId;
  //   }

  //   const tagFilters: string[] = [];
  //   if (query.tag) {
  //     tagFilters.push(query.tag);
  //   }
  //   const rawTags = (query as { tags?: string[] | string }).tags;
  //   if (Array.isArray(rawTags)) {
  //     tagFilters.push(...rawTags);
  //   } else if (typeof rawTags === 'string') {
  //     tagFilters.push(
  //       ...rawTags
  //         .split(',')
  //         .map((item) => item.trim())
  //         .filter(Boolean),
  //     );
  //   }
  //   if (tagFilters.length) {
  //     where.tags = {
  //       hasSome: Array.from(new Set(tagFilters)),
  //     };
  //   }

  //   if (query.search?.trim()) {
  //     const search = query.search.trim();
  //     where.OR = [
  //       { name: { contains: search, mode: 'insensitive' } },
  //       { description: { contains: search, mode: 'insensitive' } },
  //     ];
  //   }

  //   const [total, data] = await this.prisma.$transaction([
  //     this.prisma.document.count({ where }),
  //     this.prisma.document.findMany({
  //       where,
  //       orderBy: { createdAt: 'desc' },
  //       skip,
  //       take: limit,
  //     }),
  //   ]);

  //   return sendResponse('Documents retrieved successfully', {
  //     data,
  //     meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  //   });
  // }

  // async getOne(id: string, actor: Pick<User, 'id' | 'role'>) {
  //   const document = await this.prisma.document.findUnique({
  //     where: { id },
  //   });

  //   if (!document) {
  //     throw new NotFoundException('Document not found');
  //   }

  //   const isAdmin = actor.role === UserRole.ADMIN;
  //   if (!isAdmin && document.userId !== actor.id) {
  //     throw new ForbiddenException('Access denied');
  //   }

  //   return sendResponse('Document retrieved successfully', document);
  // }

  // async update(
  //   id: string,
  //   dto: UpdateDocumentDto,
  //   actor: Pick<User, 'id' | 'role'>,
  // ) {
  //   const document = await this.prisma.document.findUnique({
  //     where: { id },
  //     select: { id: true, userId: true },
  //   });

  //   if (!document) {
  //     throw new NotFoundException('Document not found');
  //   }

  //   const isAdmin = actor.role === UserRole.ADMIN;
  //   if (!isAdmin && document.userId !== actor.id) {
  //     throw new ForbiddenException('Access denied');
  //   }

  //   const updated = await this.prisma.document.update({
  //     where: { id: document.id },
  //     data: {
  //       appointmentId: dto.appointmentId ?? undefined,
  //       invoiceId: dto.invoiceId ?? undefined,
  //       name: dto.name ?? undefined,
  //       type: dto.type ?? undefined,
  //       status: dto.status ?? undefined,
  //       tags: dto.tags ?? undefined,
  //       description: dto.description ?? undefined,
  //     },
  //   });

  //   return sendResponse('Document updated successfully', updated);
  // }

  // async remove(id: string, actor: Pick<User, 'id' | 'role'>) {
  //   const document = await this.prisma.document.findUnique({
  //     where: { id },
  //     select: { id: true, userId: true, fileUrls: true },
  //   });

  //   if (!document) {
  //     throw new NotFoundException('Document not found');
  //   }

  //   const isAdmin = actor.role === UserRole.ADMIN;
  //   if (!isAdmin && document.userId !== actor.id) {
  //     throw new ForbiddenException('Access denied');
  //   }

  //   const filePath = this.extractSupabasePath(document.fileUrls);
  //   if (filePath) {
  //     await deleteFilesFromSupabase([filePath], this.configService);
  //   }

  //   await this.prisma.document.delete({ where: { id: document.id } });

  //   return sendResponse('Document deleted successfully');
  // }

  // private extractSupabasePath(fileUrl: string) {
  //   if (!fileUrl) return null;
  //   const marker = '/storage/v1/object/public/attachments/';
  //   const idx = fileUrl.indexOf(marker);
  //   if (idx === -1) return null;
  //   const path = fileUrl.slice(idx + marker.length);
  //   return decodeURIComponent(path.split('?')[0]);
  // }
}
