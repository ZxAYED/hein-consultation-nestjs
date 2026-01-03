import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { NotificationEvent, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { JOB, QUEUE } from '../queue.constants';

export type NotificationCreatePayload = {
  userId: string;
  event: NotificationEvent;
  title: string;
  message: string;
  metadata?: Prisma.JsonValue;
};

@Injectable()
export class NotificationProducer {
  constructor(
    @InjectQueue(QUEUE.NOTIFICATIONS)
    private readonly queue: Queue,
  ) {}

  async create(payload: NotificationCreatePayload) {
    await this.queue.add(JOB.NOTIFICATION_CREATE, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });
  }

  async emit(notificationId: string) {
    await this.queue.add(
      JOB.NOTIFICATION_EMIT,
      { notificationId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      },
    );
  }
}
