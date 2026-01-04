import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { JOB, QUEUE } from '../queue.constants';
import type { ActivityCreatePayload } from '../producers/activity.producer';

@Processor(QUEUE.ACTIVITIES)
export class ActivityProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ActivityCreatePayload>) {
    if (job.name !== JOB.ACTIVITY_CREATE) return;

    await this.prisma.activity.create({
      data: {
        event: job.data.event,
        entityId: job.data.entityId,
        actorId: job.data.actorId,
        userId: job.data.userId,
        metadata: job.data.metadata ?? undefined,
      },
    });
  }
}
