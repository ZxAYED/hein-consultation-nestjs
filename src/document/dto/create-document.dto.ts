import { DocumentStatus, DocumentType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDocumentDto {

  @IsString()
  appointmentId: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsString()
  name: string;

  @IsEnum(DocumentType)
  @IsNotEmpty()
  type: DocumentType;


  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}
