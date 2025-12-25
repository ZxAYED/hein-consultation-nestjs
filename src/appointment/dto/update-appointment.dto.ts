import { MeetingType } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAppointmentDto {
  @IsNotEmpty()
  @IsIn(['update', 'cancel', 'complete'])
  action: 'update' | 'cancel' | 'complete';

  @IsOptional()
  @IsEnum(MeetingType)
  meetingType?: MeetingType;

  @IsOptional()
  @IsString()
  note?: string;
}


