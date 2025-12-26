import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationEvent, Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ActivityService } from 'src/activity/activity.service';
import { NotificationService } from 'src/notification/notification.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

export type SystemEventPayload = {
  event: NotificationEvent;
  entityId: string;
  actorId: string;
  actorRole: UserRole;
  userId?: string;
  metadata?: Prisma.JsonValue;
  broadcast?: boolean;
};

export type AdminEventPayload = {
  actorId: string;
  title: string;
  message: string;
  userIds?: string[];
  broadcast?: boolean;
  metadata?: Prisma.JsonValue;
};

@Injectable()
export class EventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationService: NotificationService,
  ) {}

  async emitSystemEvent(payload: SystemEventPayload) {
    const targets = await this.resolveSystemTargets(payload);
    if (!targets.length) {
      throw new BadRequestException('No target users resolved');
    }

    const content = this.notificationService.buildSystemContent(
      payload.event,
      payload.metadata ?? null,
    );

    await this.prisma.$transaction(async (tx) => {
      for (const userId of targets) {
        await this.activityService.createActivity(tx, {
          event: payload.event,
          entityId: payload.entityId,
          actorId: payload.actorId,
          userId,
          metadata: payload.metadata ?? undefined,
        });

        await this.notificationService.createNotification(tx, {
          userId,
          event: payload.event,
          title: content.title,
          message: content.message,
          metadata: payload.metadata ?? undefined,
        });
      }
    });

    return sendResponse('Event emitted successfully', {
      notifications: targets.length,
    });
  }

  async emitAdminEvent(payload: AdminEventPayload) {
    this.notificationService.validateManualPayload({
      userIds: payload.userIds,
      broadcast: payload.broadcast,
    });

    const targets = await this.notificationService.resolveTargetUserIds({
      userIds: payload.userIds,
      broadcast: payload.broadcast,
    });

    if (!targets.length) {
      throw new BadRequestException('No target users resolved');
    }

    const entityId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      for (const userId of targets) {
        await this.activityService.createActivity(tx, {
          event: NotificationEvent.ADMIN_MANUAL,
          entityId,
          actorId: payload.actorId,
          userId,
          metadata: payload.metadata ?? undefined,
        });

        await this.notificationService.createNotification(tx, {
          userId,
          event: NotificationEvent.ADMIN_MANUAL,
          title: payload.title,
          message: payload.message,
          metadata: payload.metadata ?? undefined,
        });
      }
    });

    return sendResponse('Notifications created successfully', {
      notifications: targets.length,
    });
  }

  private async resolveSystemTargets(payload: SystemEventPayload) {
    if (payload.actorRole === UserRole.CUSTOMER) {
      return [payload.actorId];
    }

    return this.notificationService.resolveTargetUserIds({
      userId: payload.userId,
      broadcast: payload.broadcast,
    });
  }
}
