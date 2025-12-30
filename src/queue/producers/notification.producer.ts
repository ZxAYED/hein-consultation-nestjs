import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JOB, QUEUE } from '../queue.constants';

@Injectable()
export class NotificationProducer {
  constructor(
    @InjectQueue(QUEUE.NOTIFICATIONS)
    private readonly queue: Queue,
  ) {}

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
