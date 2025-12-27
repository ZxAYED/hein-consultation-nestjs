import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ServiceCategory } from '@prisma/client';

export class CreateServiceDto {
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name is required.' })
  name: string;

  @IsString({ message: 'Description must be a string.' })
  @IsNotEmpty({ message: 'Description is required.' })
  description: string;

  @IsEnum(ServiceCategory, {
    message: 'Invalid category provided.',
  })
  category: ServiceCategory;
}
