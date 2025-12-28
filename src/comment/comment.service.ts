import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

 async create(createCommentDto: any) {
   try {
     console.log(
      '🚀 ~ CommentService ~ create ~ createCommentDto:',
      createCommentDto,
    );

    const isBlogExist = await this.prisma.blog.findUnique({
      where: { id: createCommentDto.blogId },
    });
    if (!isBlogExist) {
      throw new BadRequestException('Blog not found');
    }

    const result =await this.prisma.comment.create({ data: createCommentDto });
    return sendResponse('Comment Added Successfully', result);
   } catch (error) {
    throw new BadRequestException(error);
   }
  }
}
