import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString({ message: 'Blog ID must be a string' })
  @IsNotEmpty({ message: 'Blog ID is required' })
  blogId: string;

  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Comment content is required' })
  content: string;
}
