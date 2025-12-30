import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { EventModule } from 'src/event/event.module';
import { NotificationModule } from 'src/notification/notification.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ActivityProcessor } from './processors/activity.processors';
import { EmailProcessor } from './processors/email.processors';
import { EventProcessor } from './processors/event.processors';
import { NotificationProcessor } from './processors/notification.processors';
import { ActivityProducer } from './producers/activity.producer';
import { EmailProducer } from './producers/email.producer';
import { EventProducer } from './producers/event.producer';
import { NotificationProducer } from './producers/notification.producer';
import { QUEUE } from './queue.constants';

@Module({
  imports: [
    forwardRef(() => EventModule), // IMPORTANT (to reuse EventService)
    NotificationModule,
    PrismaModule,
    BullModule.registerQueue(
      { name: QUEUE.ACTIVITIES },
      { name: QUEUE.EVENTS },
      { name: QUEUE.EMAILS },
      { name: QUEUE.NOTIFICATIONS },
    ),
  ],
  providers: [
    ActivityProducer,
    EventProducer,
    EmailProducer,
    NotificationProducer,
    ActivityProcessor,
    EventProcessor,
    EmailProcessor,
    NotificationProcessor,
  ],
  exports: [
    ActivityProducer,
    EventProducer,
    EmailProducer,
    NotificationProducer,
  ],
})
export class QueueModule {}
