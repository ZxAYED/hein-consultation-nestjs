import { DocumentStatus, DocumentType } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}
