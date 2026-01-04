import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { NotificationEvent, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { JOB, QUEUE } from '../queue.constants';

export type ActivityCreatePayload = {
  event: NotificationEvent;
  entityId: string;
  actorId: string;
  userId?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class ActivityProducer {
  constructor(
    @InjectQueue(QUEUE.ACTIVITIES)
    private readonly queue: Queue,
  ) {}

  async create(payload: ActivityCreatePayload) {
    await this.queue.add(JOB.ACTIVITY_CREATE, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });
  }
}
