import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { BlogCategory, BlogTags, BlogStatus } from '@prisma/client';

export class CreateBlogDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(BlogStatus)
  status: BlogStatus;

  @IsDateString()
  publishDate: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(BlogCategory, { each: true })
  categories: BlogCategory[];

  @IsArray()
  @IsOptional()
  @IsEnum(BlogTags, { each: true })
  tags?: BlogTags[];

  @IsString()
  @IsNotEmpty()
  excerpt: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
