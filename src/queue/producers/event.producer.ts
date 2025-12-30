import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AdminEventPayload, SystemEventPayload } from 'src/event/event.service';
import { JOB, QUEUE } from '../queue.constants';

@Injectable()
export class EventProducer {
  constructor(
    @InjectQueue(QUEUE.EVENTS)
    private readonly queue: Queue,
  ) {}

  async emitSystem(payload: SystemEventPayload) {
    await this.queue.add(JOB.SYSTEM_EVENT, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  async emitAdmin(payload: AdminEventPayload) {
    await this.queue.add(JOB.ADMIN_EVENT, payload);
  }
}
