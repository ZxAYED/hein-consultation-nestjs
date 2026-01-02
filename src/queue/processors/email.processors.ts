import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { sendVerificationEmail } from 'src/utils/sendVerificationEmail';
import type { SendEmailPayload } from '../producers/email.producer';
import { JOB, QUEUE } from '../queue.constants';

type EmailResult = {
  success: boolean;
  skipped?: boolean;
  error?: string;
};

@Processor(QUEUE.EMAILS)
export class EmailProcessor extends WorkerHost {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async process(job: Job<SendEmailPayload>) {
    if (job.name !== JOB.SEND_EMAIL) {
      return { ignored: true };
    }

    const result = (await sendVerificationEmail(
      this.configService,
      job.data.to,
      job.data.subject,
      job.data.html,
    )) as EmailResult;

    if (!result?.success) {
      const message =
        typeof result?.error === 'string'
          ? result.error
          : 'Email sending failed';
      throw new Error(message);
    }

    return { success: true };
  }
}
