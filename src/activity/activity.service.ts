import { Injectable } from '@nestjs/common';
import { NotificationEvent, Prisma, User, UserRole } from '@prisma/client';
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
      select: {
        id: true,
        event: true,
        entityId: true,
        userId: true,
        metadata: true,
        createdAt: true,
      },
    });

    const shaped = data.map((activity) => {
      const metaObj = this.asObject(activity.metadata);
      const type =
        typeof metaObj?.type === 'string'
          ? metaObj.type
          : this.getActivityType(activity.event);
      const description =
        typeof metaObj?.description === 'string'
          ? metaObj.description
          : this.getActivityDescription(activity.event, activity.metadata);

      return {
        id: activity.id,
        event: activity.event,
        entityId: activity.entityId,
        userId: activity.userId,
        createdAt: activity.createdAt,
        type,
        description,
      };
    });

    return sendResponse('Activities retrieved successfully', {
      data: shaped,
      meta,
    });
  }

  private getActivityType(event: NotificationEvent): string {
    switch (event) {
      case NotificationEvent.DOCUMENT_UPLOADED:
      case NotificationEvent.DOCUMENT_APPROVED:
        return 'Document';
      case NotificationEvent.APPOINTMENT_CREATED:
      case NotificationEvent.APPOINTMENT_STATUS_CHANGED:
        return 'Appointment';
      case NotificationEvent.INVOICE_CREATED:
      case NotificationEvent.INVOICE_PAID:
        return 'Invoice';
      case NotificationEvent.BLOG_CREATED:
        return 'Blog';
      case NotificationEvent.ADMIN_MANUAL:
        return 'Admin';
      default:
        return 'System';
    }
  }

  private getActivityDescription(
    event: NotificationEvent,
    metadata: Prisma.JsonValue | null,
  ): string {
    switch (event) {
      case NotificationEvent.DOCUMENT_UPLOADED:
        return 'Document uploaded';
      case NotificationEvent.DOCUMENT_APPROVED:
        return 'Document approved';
      case NotificationEvent.APPOINTMENT_CREATED:
        return 'Appointment created';
      case NotificationEvent.APPOINTMENT_STATUS_CHANGED: {
        const status = this.extractStatus(metadata);
        return status
          ? `Appointment status is now ${status}`
          : 'Appointment status updated';
      }
      case NotificationEvent.INVOICE_CREATED:
        return 'Invoice created';
      case NotificationEvent.INVOICE_PAID:
        return 'Invoice paid';
      case NotificationEvent.BLOG_CREATED:
        return 'New blog post';
      case NotificationEvent.ADMIN_MANUAL:
        return 'Manual admin action';
      default:
        return 'System activity recorded';
    }
  }

  private extractStatus(metadata: Prisma.JsonValue | null): string | undefined {
    const obj = this.asObject(metadata);
    const status = obj?.status;
    return typeof status === 'string' && status.trim() ? status : undefined;
  }

  private asObject(
    value: Prisma.JsonValue | null,
  ): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
  }
}
