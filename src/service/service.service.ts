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

  async create(data: Service) {
    try {
      const result = await this.prisma.service.create({ data });
      return sendResponse('Service Created Successfully', result);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findBySlug(slug: string) {
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

 
  async findAll(page?: number, limit?: number, searchTerm?: string) {
    try {
      // Where clause
      const where: any = {};

      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ];
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

      return sendResponse('Services fetched successfully', { data, meta });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async getMyselfServices(id: string, page?: number, limit?: number) {
    try {
      const where: any = { adminId: id };

      const totalItems = await this.prisma.service.count({ where });

      const { skip, take, meta } = getPagination(page, limit, totalItems);

      const data = await this.prisma.service.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });

      return sendResponse('Services Services fetched successfully', { data, meta });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findOne(id: string) {
    try {
      const service = await this.prisma.service.findUnique({ where: { id } });

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      return service;
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
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
