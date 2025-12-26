import { Injectable } from '@nestjs/common';
import { Prisma, User, UserRole } from '@prisma/client';
import { getPagination } from 'src/common/utils/pagination';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { GetActivitiesQueryDto } from './dto/get-activities-query.dto';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async createActivity(
    tx: Prisma.TransactionClient,
    data: Prisma.ActivityCreateInput,
  ) {
    return await tx.activity.create({ data });
  }

  async list(query: GetActivitiesQueryDto, actor: Pick<User, 'id' | 'role'>) {
    const isAdmin = actor.role === UserRole.ADMIN;
    const where: Prisma.ActivityWhereInput = isAdmin
      ? {}
      : { userId: actor.id };

    if (query.event) {
      where.event = query.event;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    const totalItems = await this.prisma.activity.count({ where });
    const { skip, take, meta } = getPagination(
      query.page,
      query.limit,
      totalItems,
    );

    const data = await this.prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return sendResponse('Activities retrieved successfully', { data, meta });
  }
}
