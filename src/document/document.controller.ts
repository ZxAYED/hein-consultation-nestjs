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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Request } from 'express';
import multer from 'multer';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { ROLE } from 'src/user/entities/role.entity';
import { uploadFileToSupabase } from 'src/utils/common/uploadFileToSupabase';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { GetDocumentsQueryDto } from './dto/get-documents-query.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private configService: ConfigService,
  ) {}

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER)
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multer.memoryStorage(),
    }),
  )
  async create(
    @Req() req: Request & { user: { id: string } },
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    const rawBody: any = body ?? {};
    let parsed: any = rawBody;

    if (typeof rawBody?.data === 'string' && rawBody.data.trim().length) {
      try {
        const json = JSON.parse(rawBody.data);
        parsed = { ...rawBody, ...json };
      } catch {
        throw new BadRequestException('Invalid JSON in data field');
      }
    }

    delete parsed.data;

    if (typeof parsed.tags === 'string') {
      parsed.tags = parsed.tags
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean);
    }

    const dto = plainToInstance(CreateDocumentDto, {
      ...parsed,
      name: parsed?.name ?? files[0]?.originalname,
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length) {
      throw new BadRequestException(errors);
    }

    const fileLinks = await Promise.all(
      files.map((file) =>
        uploadFileToSupabase(file, this.configService, 'documents'),
      ),
    );

    const totalSize = files.reduce((sum, file) => sum + (file.size ?? 0), 0);

    const format = this.resolveFormat(files);

    return this.documentService.create(
      dto,
      { fileUrls: fileLinks, format, size: totalSize },
      req.user,
    );
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
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentService.update(id, dto);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.documentService.remove(id);
  }

  private resolveFormat(files: Express.Multer.File[]) {
    const formats = files
      .map((file) => this.extractFormat(file))
      .filter((format): format is string => Boolean(format));

    return formats.length ? formats[0] : null;
  }

  private extractFormat(file: Express.Multer.File) {
    const originalName = file.originalname ?? '';
    const dotIndex = originalName.lastIndexOf('.');
    if (dotIndex > -1 && dotIndex < originalName.length - 1) {
      return originalName.slice(dotIndex + 1).toLowerCase();
    }

    if (file.mimetype) {
      const slashIndex = file.mimetype.lastIndexOf('/');
      if (slashIndex > -1 && slashIndex < file.mimetype.length - 1) {
        return file.mimetype.slice(slashIndex + 1).toLowerCase();
      }
    }

    return null;
  }
}
