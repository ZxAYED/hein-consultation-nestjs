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
  ) {}

  // @UseGuards(AuthGuard)
  // @Roles(ROLE.CUSTOMER, ROLE.ADMIN)
  // @Post()
  // @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  // async create(
  //   @Req() req: Request & { user: any },
  //   @Body() body: any,
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   if (!body?.data) throw new BadRequestException('Body data is required');
  //   if (!file) throw new BadRequestException('File is required');

  //   let parsed: CreateDocumentDto;
  //   try {
  //     parsed = JSON.parse(body.data);
  //   } catch {
  //     throw new BadRequestException('Invalid JSON in body data');
  //   }

  //   // Generate unique slug

  //   // Upload image
  //   const fileLink = await uploadFileToSupabase(
  //     file,
  //     this.configService,
  //     'blog',
  //   );

  //   const documentData ={
  //     ...parsed,
  //     fileLink,
  //     userId: req?.user?.id,
  //   };
  //   console.log("🚀 ~ DocumentController ~ create ~ documentData:", documentData)

  //   // const document = await this.documentService.create(documentData);
  //   // return document

  // }

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

    const documentData = {
  name: parsed.name,
  type: parsed.type,
  status: DocumentStatus.Open, // required
  fileUrls: fileLinks,          // required
  tags: parsed.tags ?? [],      // required
  description: parsed.description ?? null,

  user: { connect: { id: req.user.id } },

  ...(parsed.appointmentId && { appointment: { connect: { id: parsed.appointmentId } } }),
  ...(parsed.invoiceId && { invoice: { connect: { id: parsed.invoiceId } } }),
};


    // console.log(
    //   '🚀 ~ DocumentController ~ create ~ documentData:',
    //   documentData,
    // );

    // return this.
    return this.documentService.create(documentData);
  }
 
}
