import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { JOB, QUEUE } from '../queue.constants';

@Processor(QUEUE.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {
    super();
  }

  async process(job: Job<{ notificationId: string }>) {
    if (job.name !== JOB.NOTIFICATION_EMIT) return;

    const notification = await this.prisma.notification.findUnique({
      where: { id: job.data.notificationId },
    });

    if (!notification) return;

    this.gateway.emitNotification(notification);
  }
}
