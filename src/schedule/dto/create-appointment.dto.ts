import { MeetingType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @IsEnum(MeetingType)
  meetingType: MeetingType;

  @IsOptional()
  @IsString()
  note?: string;
}
