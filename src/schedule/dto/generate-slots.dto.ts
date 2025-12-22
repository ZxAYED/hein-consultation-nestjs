import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import type { ServiceName } from '../entities/service-name.entity';
import { SERVICE_NAME_VALUES } from '../entities/service-name.entity';

export class GenerateSlotsDto {
  @IsNotEmpty()
  @IsIn(SERVICE_NAME_VALUES)
  serviceName: ServiceName;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime: string;

  @IsInt()
  @Min(1)
  durationMin: number;
}
