import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Queue } from 'bullmq';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { JOB, QUEUE } from '../queue.constants';
import type { NotificationCreatePayload } from '../producers/notification.producer';

@Processor(QUEUE.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
    @InjectQueue(QUEUE.NOTIFICATIONS)
    private readonly queue: Queue,
  ) {
    super();
  }

  async process(
    job: Job<{ notificationId: string } | NotificationCreatePayload>,
  ) {
    switch (job.name) {
      case JOB.NOTIFICATION_CREATE: {
        const payload = job.data as NotificationCreatePayload;
        const notification = await this.prisma.notification.create({
          data: {
            userId: payload.userId,
            event: payload.event,
            title: payload.title,
            message: payload.message,
            metadata: payload.metadata ?? undefined,
          },
        });

        await this.queue.add(
          JOB.NOTIFICATION_EMIT,
          { notificationId: notification.id },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          },
        );
        return;
      }

      case JOB.NOTIFICATION_EMIT: {
        const data = job.data as { notificationId: string };
        const notification = await this.prisma.notification.findUnique({
          where: { id: data.notificationId },
        });

        if (!notification) return;

        this.gateway.emitNotification(notification);
        return;
      }
    }
  }
}
