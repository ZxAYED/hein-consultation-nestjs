import { DocumentStatus, DocumentType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(DocumentType)
  @IsNotEmpty()
  type: DocumentType;

  @IsEnum(DocumentStatus)
  @IsNotEmpty()
  status: DocumentStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}
