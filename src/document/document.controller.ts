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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
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

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async create(
    @Req() req: Request & { user: { id: string; role: UserRole } },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const rawBody: any = req.body ?? {};

    let payload: Record<string, unknown> = { ...rawBody };
    if (typeof rawBody?.data === 'string' && rawBody.data.trim().length) {
      try {
        payload = { ...payload, ...JSON.parse(rawBody.data) };
      } catch {
        throw new BadRequestException('Invalid JSON in data field');
      }
    }

    delete (payload as any).data;

    const normalizeTags = (value: unknown): string[] | undefined => {
      if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed
                .map((item) => String(item).trim())
                .filter(Boolean);
            }
          } catch {
            // Fall back to comma-split below.
          }
        }
        return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
      }
      return undefined;
    };

    const normalizedTags = normalizeTags(payload.tags);
    if (normalizedTags) {
      payload.tags = normalizedTags;
    }

    const dto = plainToInstance(CreateDocumentDto, payload);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length) {
      throw new BadRequestException(errors);
    }

    return this.documentService.create(dto, file, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Get()
  list(
    @Query() query: GetDocumentsQueryDto,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.documentService.list(query, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.documentService.getOne(id, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.documentService.update(id, dto, req.user);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.documentService.remove(id, req.user);
  }
}
