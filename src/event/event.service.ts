import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationEvent, Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotificationService } from 'src/notification/notification.service';
import {
  ActivityCreatePayload,
  ActivityProducer,
} from 'src/queue/producers/activity.producer';
import { EventProducer } from 'src/queue/producers/event.producer';
import {
  NotificationCreatePayload,
  NotificationProducer,
} from 'src/queue/producers/notification.producer';
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
    private readonly notificationService: NotificationService,
    private readonly activityProducer: ActivityProducer,
    private readonly eventProducer: EventProducer,
    private readonly notificationProducer: NotificationProducer,
  ) {}

  async emitSystemEvent(payload: SystemEventPayload) {
    await this.eventProducer.emitSystem(payload);
    return sendResponse('Event queued successfully');
  }

  async emitAdminEvent(payload: AdminEventPayload) {
    this.notificationService.validateManualPayload({
      userIds: payload.userIds,
      broadcast: payload.broadcast,
    });

    await this.eventProducer.emitAdmin(payload);
    return sendResponse('Admin notification queued successfully');
  }

  async processSystemEvent(payload: SystemEventPayload) {
    const targets = await this.resolveSystemTargets(payload);
    if (!targets.length) {
      throw new BadRequestException('No target users resolved');
    }

    const content = this.notificationService.buildSystemContent(
      payload.event,
      payload.metadata ?? null,
    );
    const mergedMetadata = this.mergeActivityMetadata({
      event: payload.event,
      metadata: payload.metadata,
      message: content.message,
    });

    const activityJobs: ActivityCreatePayload[] = [];
    const notificationJobs: NotificationCreatePayload[] = [];

    for (const userId of targets) {
      activityJobs.push({
        event: payload.event,
        entityId: payload.entityId,
        actorId: payload.actorId,
        userId,
        metadata: mergedMetadata,
      });

      notificationJobs.push({
        userId,
        event: payload.event,
        title: content.title,
        message: content.message,
        metadata: payload.metadata ?? undefined,
      });
    }

    for (const job of activityJobs) {
      await this.activityProducer.create(job);
    }

    for (const job of notificationJobs) {
      await this.notificationProducer.create(job);
    }

    return sendResponse('Event emitted successfully', {
      notifications: targets.length,
    });
  }

  async processAdminEvent(payload: AdminEventPayload) {
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
    const activityJobs: ActivityCreatePayload[] = [];
    const notificationJobs: NotificationCreatePayload[] = [];
    const mergedMetadata = this.mergeActivityMetadata({
      event: NotificationEvent.ADMIN_MANUAL,
      metadata: payload.metadata,
      message: payload.message,
    });

    for (const userId of targets) {
      activityJobs.push({
        event: NotificationEvent.ADMIN_MANUAL,
        entityId,
        actorId: payload.actorId,
        userId,
        metadata: mergedMetadata,
      });

      notificationJobs.push({
        userId,
        event: NotificationEvent.ADMIN_MANUAL,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata ?? undefined,
      });
    }

    for (const job of activityJobs) {
      await this.activityProducer.create(job);
    }

    for (const job of notificationJobs) {
      await this.notificationProducer.create(job);
    }

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

  private mergeActivityMetadata(input: {
    event: NotificationEvent;
    metadata?: Prisma.JsonValue;
    message?: string;
  }): Prisma.InputJsonValue {
    const base = this.asObject(input.metadata) ?? {};

    const type =
      typeof base.type === 'string'
        ? base.type
        : this.getActivityType(input.event);

    const description =
      typeof base.description === 'string'
        ? base.description
        : typeof input.message === 'string' && input.message.trim()
          ? input.message
          : this.getActivityDescription(input.event, input.metadata);

    return { ...base, type, description } as Prisma.InputJsonValue;
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
    metadata?: Prisma.JsonValue,
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

  private extractStatus(metadata?: Prisma.JsonValue): string | undefined {
    const obj = this.asObject(metadata);
    const status = obj?.status;
    return typeof status === 'string' && status.trim() ? status : undefined;
  }

  private asObject(
    value?: Prisma.JsonValue,
  ): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
  }
}
