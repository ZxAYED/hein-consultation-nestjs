import { MeetingType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsEnum(MeetingType)
  meetingType?: MeetingType;

  @IsOptional()
  @IsString()
  note?: string;
}
