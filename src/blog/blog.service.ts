import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Blog } from '@prisma/client';
import { sendResponse } from 'src/utils/sendResponse';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    // console.log("🚀 ~ BlogService ~ create ~ data:", data)

    const result = await this.prisma.blog.create({ data });

    return sendResponse('Blog Created Successfully', result);
  }

  async findBySlug(slug: string): Promise<Blog | null> {
    return this.prisma.blog.findUnique({ where: { slug } });
  }

  async findAll(): Promise<Blog[]> {
    return this.prisma.blog.findMany();
  }

  async findOne(id: string): Promise<Blog | null> {
    return this.prisma.blog.findUnique({ where: { id } });
  }

  async update(id: string, data: any): Promise<Blog> {
    return this.prisma.blog.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Blog> {
    return this.prisma.blog.delete({ where: { id } });
  }
}
