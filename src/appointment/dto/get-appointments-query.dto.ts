import { AppointmentStatus } from '@prisma/client';
import {
    IsEnum,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Matches,
    Max,
    Min,
} from 'class-validator';
import type { ServiceName } from 'src/schedule/entities/service-name.entity';
import { SERVICE_NAME_VALUES } from 'src/schedule/entities/service-name.entity';

export class GetAppointmentsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsIn(SERVICE_NAME_VALUES)
  serviceName?: ServiceName;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fromDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  toDate?: string;
}
