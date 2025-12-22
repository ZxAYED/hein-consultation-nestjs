import { MeetingType } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { ServiceName } from 'src/schedule/entities/service-name.entity';
import { SERVICE_NAME_VALUES } from 'src/schedule/entities/service-name.entity';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  @IsIn(SERVICE_NAME_VALUES)
  serviceName: ServiceName;

  @IsString()
  @IsNotEmpty()
  slotId: string;

  @IsEnum(MeetingType)
  meetingType: MeetingType;

  @IsOptional()
  @IsString()
  note?: string;
}
