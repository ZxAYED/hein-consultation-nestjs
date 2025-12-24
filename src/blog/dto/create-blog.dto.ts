import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
} from 'class-validator';
import { BlogCategory, BlogTags } from '@prisma/client';

export class CreateBlogDto {
  @IsString({ message: 'Title must be a string.' })
  @IsNotEmpty({ message: 'Title is required.' })
  title: string;

  @IsString({ message: 'Excerpt must be a string.' })
  @IsNotEmpty({ message: 'Excerpt is required.' })
  excerpt: string;

  @IsString({ message: 'Content must be a string.' })
  @IsNotEmpty({ message: 'Content is required.' })
  content: string;

  @IsArray({ message: 'Categories must be an array.' })
  @ArrayNotEmpty({ message: 'At least one category is required.' })
  @IsEnum(BlogCategory, { each: true, message: 'Invalid category provided.' })
  categories: BlogCategory[];

  @IsArray({ message: 'Tags must be an array.' })
  @ArrayNotEmpty({ message: 'At least one tag is required.' })
  @IsEnum(BlogTags, { each: true, message: 'Invalid tag provided.' })
  tags: BlogTags[];
}
