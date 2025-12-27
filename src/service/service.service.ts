import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { getPagination } from 'src/common/utils/pagination';
import { Service } from '@prisma/client';

@Injectable()
export class ServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    try {
      return await this.prisma.service.create({ data });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findAll(page?: number, limit?: number, searchTerm?: string, category?: string) {
    try {
      // Where clause
      const where: any = {};

      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      if (category) {
        where.category = category;
      }

      // Total count
      const totalItems = await this.prisma.service.count({ where });

      // Pagination
      const { skip, take, meta } = getPagination(page, limit, totalItems);

      // Fetch data
      const data = await this.prisma.service.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { admin: true },
      });

      return sendResponse('Blogs fetched successfully', { data, meta });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findBySlug(slug: string): Promise<Service | null> {
    try {
      return await this.prisma.service.findUnique({ where: { slug } });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
