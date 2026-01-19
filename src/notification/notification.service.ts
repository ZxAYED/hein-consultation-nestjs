/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationEvent, Prisma, User, UserRole } from '@prisma/client';
import { getPagination } from 'src/common/utils/pagination';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';

type NotificationContent = {
  title: string;
  message: string;
};

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(
    tx: Prisma.TransactionClient,
    data: Prisma.NotificationUncheckedCreateInput,
  ) {
    return await tx.notification.create({ data });
  }

  async resolveTargetUserIds(options: {
    userId?: string;
    userIds?: string[];
    broadcast?: boolean;
  }) {
    if (options.broadcast) {
      const users = await this.prisma.user.findMany({
        select: { id: true },
      });
      return users.map((user) => user.id);
    }

    const targets = new Set<string>();
    if (options.userId) {
      targets.add(options.userId);
    }
    if (Array.isArray(options.userIds)) {
      options.userIds
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id))
        .forEach((id) => targets.add(id));
    }

    return Array.from(targets);
  }

  buildSystemContent(
    event: NotificationEvent,
    metadata?: Prisma.JsonValue | null,
  ): NotificationContent {
    switch (event) {
      case NotificationEvent.DOCUMENT_UPLOADED:
        return {
          title: 'Document uploaded',
          message: 'Your document has been uploaded successfully.',
        };
      case NotificationEvent.DOCUMENT_APPROVED:
        return {
          title: 'Document approved',
          message: 'Your document has been approved.',
        };
      case NotificationEvent.APPOINTMENT_CREATED:
        return {
          title: 'Appointment created',
          message: 'Your appointment has been created.',
        };
      case NotificationEvent.APPOINTMENT_STATUS_CHANGED: {
        const status = this.extractStatus(metadata);
        return {
          title: 'Appointment status updated',
          message: status
            ? `Your appointment status is now ${status}.`
            : 'Your appointment status has been updated.',
        };
      }
      case NotificationEvent.INVOICE_CREATED:
        return {
          title: 'Invoice created',
          message: 'A new invoice has been issued.',
        };
      case NotificationEvent.INVOICE_PAID:
        return {
          title: 'Invoice paid',
          message: 'Your invoice has been marked as paid.',
        };
      case NotificationEvent.BLOG_CREATED:
        return {
          title: 'New blog post',
          message: 'A new blog post is now available.',
        };
      default:
        return {
          title: 'Notification',
          message: 'You have a new notification.',
        };
    }
  }

  async list(
    query: GetNotificationsQueryDto,
    actor: Pick<User, 'id' | 'role'>,
  ) {
    const isAdmin = actor.role === UserRole.ADMIN;
    const where: Prisma.NotificationWhereInput = isAdmin
      ? {}
      : { userId: actor.id };

    if (query.event) {
      where.event = query.event;
    }

    if (typeof query.isRead === 'boolean') {
      if (isAdmin) {
        where.isAdminRead = query.isRead;
      } else {
        where.isCustomerRead = query.isRead;
      }
    }

    const totalItems = await this.prisma.notification.count({ where });
    const { skip, take, meta } = getPagination(
      query.page,
      query.limit,
      totalItems,
    );

    const data = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return sendResponse('Notifications retrieved successfully', { data, meta });
  }

  async markAsRead(id: string, actor: Pick<User, 'id' | 'role'>) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        isAdminRead: true,
        isCustomerRead: true,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const isAdmin = actor.role === UserRole.ADMIN;
    if (!isAdmin && notification.userId !== actor.id) {
      throw new ForbiddenException('Access denied');
    }

    if (isAdmin) {
      if (notification.isAdminRead) {
        return sendResponse('Notification marked as read', notification);
      }

      const updated = await this.prisma.notification.update({
        where: { id: notification.id },
        data: { isAdminRead: true },
      });
      return sendResponse('Notification marked as read', updated);
    } else {
      if (notification.isCustomerRead) {
        return sendResponse('Notification marked as read', notification);
      }

      const updated = await this.prisma.notification.update({
        where: { id: notification.id },
        data: { isCustomerRead: true },
      });
      return sendResponse('Notification marked as read', updated);
    }
  }

  async markAllAsRead(actor: Pick<User, 'id' | 'role'>) {
    const isAdmin = actor.role === UserRole.ADMIN;
    const where: Prisma.NotificationWhereInput = isAdmin
      ? {}
      : { userId: actor.id };

    const result = await this.prisma.notification.updateMany({
      where: {
        ...where,
        ...(isAdmin ? { isAdminRead: false } : { isCustomerRead: false }),
      },
      data: isAdmin ? { isAdminRead: true } : { isCustomerRead: true },
    });

    if (!result.count) {
      return sendResponse('No unread notifications found');
    }

    return sendResponse('Notifications marked as read', {
      updated: result.count,
    });
  }

  private extractStatus(metadata?: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return undefined;
    }

    const record = metadata as Record<string, unknown>;
    const status = record.status;
    return typeof status === 'string' ? status : undefined;
  }

  validateManualPayload(input: { userIds?: string[]; broadcast?: boolean }) {
    if (input.broadcast) {
      return;
    }

    if (!input.userIds || input.userIds.length === 0) {
      throw new BadRequestException(
        'userIds must be provided when broadcast is false',
      );
    }
  }
}
