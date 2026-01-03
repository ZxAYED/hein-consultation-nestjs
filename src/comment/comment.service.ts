import { BadRequestException, Injectable } from '@nestjs/common';
import { CacheUtil } from 'src/cache/redis-cache.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheUtil: CacheUtil,
  ) {}

 async create(createCommentDto: any) {
   try {
    

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
