import { Injectable } from '@nestjs/common';
import { Prisma, User, UserRole } from '@prisma/client';
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
        take: 5,
      }),
      this.prisma.notification.findMany({
        where: notificationWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return sendResponse('Dashboard retrieved successfully', {
      stats,
      recentActivities,
      recentNotifications,
    });
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
        this.prisma.notification.count({ where: { isRead: false } }),
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
          where: { userId: actor.id, isRead: false },
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
