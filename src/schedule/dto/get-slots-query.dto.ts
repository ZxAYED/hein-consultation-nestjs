import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';
import type { ServiceName } from '../entities/service-name.entity';
import { SERVICE_NAME_VALUES } from '../entities/service-name.entity';

export class GetSlotsQueryDto {
  @IsNotEmpty()
  @IsIn(SERVICE_NAME_VALUES)
  serviceName: ServiceName;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}
