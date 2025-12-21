import { IsInt, IsNotEmpty, IsString, Matches, Min } from 'class-validator';

export class GenerateSlotsDto {
  @IsString()
  @IsNotEmpty()
  serviceName: string;

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
