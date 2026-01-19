import { Injectable } from '@nestjs/common';
import { NotificationEvent, Prisma, User, UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(actor: Pick<User, 'id' | 'role'>) {
    return this.getStats(actor);
  }

  async getStats(actor: Pick<User, 'id' | 'role'>) {
    const isAdmin = actor.role === UserRole.ADMIN;
    const notificationWhere: Prisma.NotificationWhereInput = isAdmin
      ? {}
      : { userId: actor.id };
    const activityWhere: Prisma.ActivityWhereInput = isAdmin
      ? {}
      : { userId: actor.id };

    const [stats, recentActivities, recentNotifications] = await Promise.all([
      this.getCounts(actor),
      this.prisma.activity.findMany({
        where: activityWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.notification.findMany({
        where: notificationWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const shapedRecentActivities = recentActivities.map((activity) => {
      const metaObj = this.asObject(activity.metadata);
      const type =
        typeof metaObj?.type === 'string'
          ? metaObj.type
          : this.getActivityType(activity.event);
      const description =
        typeof metaObj?.description === 'string'
          ? metaObj.description
          : this.getActivityDescription(activity.event, activity.metadata);

      return { ...activity, type, description };
    });

    return sendResponse('Dashboard retrieved successfully', {
      stats,
      recentActivities: shapedRecentActivities,
      recentNotifications,
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

  private async getCounts(actor: Pick<User, 'id' | 'role'>) {
    const isAdmin = actor.role === UserRole.ADMIN;
    if (isAdmin) {
      const [
        users,
        appointments,
        documents,
        invoices,
        blogs,
        unreadNotifications,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.appointment.count(),
        this.prisma.document.count(),
        this.prisma.invoice.count(),
        this.prisma.blog.count(),
        this.prisma.notification.count({ where: { isAdminRead: false } }),
      ]);

      return {
        users,
        appointments,
        documents,
        invoices,
        blogs,
        unreadNotifications,
      };
    }

    const [appointments, documents, invoices, unreadNotifications] =
      await Promise.all([
        this.prisma.appointment.count({ where: { userId: actor.id } }),
        this.prisma.document.count({ where: { userId: actor.id } }),
        this.prisma.invoice.count({ where: { userId: actor.id } }),
        this.prisma.notification.count({
          where: { userId: actor.id, isCustomerRead: false },
        }),
      ]);

    return {
      appointments,
      documents,
      invoices,
      unreadNotifications,
    };
  }
}
