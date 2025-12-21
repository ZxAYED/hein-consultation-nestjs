import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class GetSlotsQueryDto {
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}
