import { InvoicePaymentType, InvoiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  appointmentId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;

  @IsEnum(InvoicePaymentType)
  paymentType: InvoicePaymentType;

  @IsString()
  @IsNotEmpty()
  issuedBy: string;

  @IsOptional()
  @IsString()
  issuedAt?: string;

  @IsString()
  @IsNotEmpty()
  dueDate: string;
}
