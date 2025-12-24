import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Blog } from '@prisma/client';
import { sendResponse } from 'src/utils/sendResponse';
import { getPagination } from 'src/common/utils/pagination';

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

  async findAll(page?: number, limit?: number) {
    const where: any = {};

    const totalItems = await this.prisma.blog.count({
      where,
    });

    const { skip, take, meta } = getPagination(page, limit, totalItems);

    const data = await this.prisma.blog.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sendResponse('Blogs fetched successfully', { data, meta });
  }

  async getMyselfBlogs(id: string,page?: number, limit?: number) {
      const where: any = {
        adminId: id
      };

    const totalItems = await this.prisma.blog.count({
      where,
    });

    const { skip, take, meta } = getPagination(page, limit, totalItems);

    const data = await this.prisma.blog.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sendResponse('Myself Blogs fetched successfully', { data, meta });
    
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
