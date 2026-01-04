
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JOB, QUEUE } from '../queue.constants';

export type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
};

@Injectable()
export class EmailProducer {
  constructor(
    @InjectQueue(QUEUE.EMAILS)
    private readonly queue: Queue,
  ) {}

  async send(payload: SendEmailPayload) {
    await this.queue.add(JOB.SEND_EMAIL, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });
  }
}
