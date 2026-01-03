
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  AdminEventPayload,
  EventService,
  SystemEventPayload,
} from 'src/event/event.service';
import { JOB, QUEUE } from '../queue.constants';

@Processor(QUEUE.EVENTS)
export class EventProcessor extends WorkerHost {
  constructor(private readonly eventService: EventService) {
    super();
  }

  async process(job: Job<SystemEventPayload | AdminEventPayload>) {
    switch (job.name) {
      case JOB.SYSTEM_EVENT:
        return await this.eventService.processSystemEvent(
          job.data as SystemEventPayload,
        );

      case JOB.ADMIN_EVENT:
        return await this.eventService.processAdminEvent(
          job.data as AdminEventPayload,
        );
    }
  }
}
