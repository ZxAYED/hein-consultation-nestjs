import { MeetingType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @IsString()
  @IsNotEmpty()
  slotId: string;

  @IsEnum(MeetingType)
  meetingType: MeetingType;

  @IsOptional()
  @IsString()
  note?: string;
}
