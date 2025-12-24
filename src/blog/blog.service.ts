import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Blog } from '@prisma/client';
import { sendResponse } from 'src/utils/sendResponse';
import { getPagination } from 'src/common/utils/pagination';
import { CreateBlogDto } from './dto/create-blog.dto';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Blog) {
    try {
      const result = await this.prisma.blog.create({ data });
      return sendResponse('Blog Created Successfully', result);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findBySlug(slug: string): Promise<Blog | null> {
    try {
      return await this.prisma.blog.findUnique({ where: { slug } });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findBySlug2(slug: string) {
    try {
      const result = await this.prisma.blog.findUnique({ where: { slug } });

      if (!result) {
        throw new NotFoundException('Blog not found');
      }

      return sendResponse('Blog Fetched Successfully', result);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findAll(page?: number, limit?: number, searchTerm?: string) {
  try {
    // Where clause
    const where: any = {};

    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { excerpt: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Total count
    const totalItems = await this.prisma.blog.count({ where });

    // Pagination
    const { skip, take, meta } = getPagination(page, limit, totalItems);

    // Fetch data
    const data = await this.prisma.blog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse('Blogs fetched successfully', { data, meta });
  } catch (error) {
    throw new BadRequestException(error);
  }
}

  async getMyselfBlogs(id: string, page?: number, limit?: number) {
    try {
      const where: any = { adminId: id };

      const totalItems = await this.prisma.blog.count({ where });

      const { skip, take, meta } = getPagination(page, limit, totalItems);

      const data = await this.prisma.blog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });

      return sendResponse('Myself Blogs fetched successfully', { data, meta });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findOne(id: string): Promise<Blog | null> {
    try {
      const blog = await this.prisma.blog.findUnique({ where: { id } });

      if (!blog) {
        throw new NotFoundException('Blog not found');
      }

      return blog;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async update(id: string, data: any): Promise<Blog> {
    try {
      return await this.prisma.blog.update({ where: { id }, data });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async remove(slug: string) {
    try {
      const isBlogExist = await this.prisma.blog.findUnique({ where: { slug } });
      if (!isBlogExist) {
        throw new NotFoundException('Blog not found');
      }
       await this.prisma.blog.delete({ where: { slug } });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
