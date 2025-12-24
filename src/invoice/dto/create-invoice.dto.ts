import { InvoicePaymentType, InvoiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @IsOptional()
  @IsString()
  invoiceNo?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;

  @IsEnum(InvoicePaymentType)
  paymentType: InvoicePaymentType;

  @IsOptional()
  @IsString()
  issuedAt?: string;

  @IsString()
  @IsNotEmpty()
  dueDate: string;
}
