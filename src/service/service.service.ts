import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { getPagination } from 'src/common/utils/pagination';
import { CacheUtil } from 'src/cache/redis-cache.util';

@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheUtil: CacheUtil,
  ) {}

  async create(data: any) {
    try {
      const result = await this.prisma.service.create({ data });
      await this.cacheUtil.deleteByPattern('services:list:*'); // invalidate cache
      return result;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  // async findAll(
  //   page?: number,
  //   limit?: number,
  //   searchTerm?: string,
  //   category?: string,
  // ) {
  //   try {
  //     // Where clause
  //     const where: any = {};

  //     if (searchTerm) {
  //       where.OR = [
  //         { name: { contains: searchTerm, mode: 'insensitive' } },
  //         { description: { contains: searchTerm, mode: 'insensitive' } },
  //       ];
  //     }

  //     if (category) {
  //       where.category = category;
  //     }

  //     // Total count
  //     const totalItems = await this.prisma.service.count({ where });

  //     // Pagination
  //     const { skip, take, meta } = getPagination(page, limit, totalItems);

  //     // Fetch data
  //     const data = await this.prisma.service.findMany({
  //       where,
  //       skip,
  //       take,
  //       orderBy: { createdAt: 'desc' },
  //       include: { admin: true },
  //     });

  //     return sendResponse('Blogs fetched successfully', { data, meta });
  //   } catch (error) {
  //     throw new BadRequestException(error);
  //   }
  // }

  async findAll(
    page?: number,
    limit?: number,
    searchTerm?: string,
    category?: string,
  ) {
    try {
      const cacheKey = `services:list:page=${page || 1}:limit=${limit || 10}:search=${searchTerm || 'all'}:category=${category || 'all'}`;

      const result = await this.cacheUtil.getWithAutoRefresh(
        cacheKey,
        async () => {
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

          const totalItems = await this.prisma.service.count({ where });
          const { skip, take, meta } = getPagination(page, limit, totalItems);

          const data = await this.prisma.service.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: { admin: true },
          });

          return sendResponse('Services fetched successfully', { data, meta });
        },
        7200, // TTL 2 hours
      );

      return result;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findBySlug(slug: string) {
    try {
      return await this.prisma.service.findUnique({ where: { slug } });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findOne(slug: string) {
    try {
      const result = await this.prisma.service.findUnique({ where: { slug } });
      if (!result) {
        throw new NotFoundException('Service not found');
      }
      return sendResponse('Service Fetched Successfully', result);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async update(id: string, data: any) {
    try {
      const isServiceExist = await this.prisma.service.findUnique({
        where: { id },
      });
      if (!isServiceExist) {
        throw new NotFoundException('Service not found');
      }
      const result = await this.prisma.service.update({
        where: { id },
        data,
      });
      await this.cacheUtil.deleteByPattern('services:list:*'); // invalidate cache

      return sendResponse('Service Updated Successfully', result);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async remove(slug: string) {
    try {
      const isServiceExist = await this.prisma.service.findUnique({
        where: { slug },
      });
      if (!isServiceExist) {
        throw new NotFoundException('Service not found');
      }
      await this.prisma.service.delete({ where: { slug } });
      await this.cacheUtil.deleteByPattern('services:list:*'); // invalidate cache

      return sendResponse('Service Deleted Successfully');
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
