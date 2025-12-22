import { ServiceName } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';

export class GetSlotsQueryDto {
  @IsNotEmpty()
  @IsEnum(ServiceName)
  serviceName: ServiceName;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}
