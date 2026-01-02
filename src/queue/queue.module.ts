import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  forwardRef,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { EventModule } from 'src/event/event.module';
import { NotificationModule } from 'src/notification/notification.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BullBoardAuthMiddleware } from './bull-board-auth.middleware';
import { ActivityProcessor } from './processors/activity.processors';
import { EmailProcessor } from './processors/email.processors';
import { EventProcessor } from './processors/event.processors';
import { NotificationProcessor } from './processors/notification.processors';
import { ActivityProducer } from './producers/activity.producer';
import { EmailProducer } from './producers/email.producer';
import { EventProducer } from './producers/event.producer';
import { NotificationProducer } from './producers/notification.producer';
import { QUEUE } from './queue.constants';

@Global()
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
    BullBoardAuthMiddleware,
  ],
  exports: [
    ActivityProducer,
    EventProducer,
    EmailProducer,
    NotificationProducer,
  ],
})
export class QueueModule implements NestModule {
  constructor(
    @InjectQueue(QUEUE.ACTIVITIES) private readonly activitiesQueue: Queue,
    @InjectQueue(QUEUE.EVENTS) private readonly eventsQueue: Queue,
    @InjectQueue(QUEUE.EMAILS) private readonly emailsQueue: Queue,
    @InjectQueue(QUEUE.NOTIFICATIONS) private readonly notificationsQueue: Queue,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    const basePath = '/admin/queues';

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath(basePath);

    createBullBoard({
      queues: [
        new BullMQAdapter(this.activitiesQueue),
        new BullMQAdapter(this.eventsQueue),
        new BullMQAdapter(this.emailsQueue),
        new BullMQAdapter(this.notificationsQueue),
      ],
      serverAdapter,
    });

    consumer
      .apply(BullBoardAuthMiddleware, serverAdapter.getRouter())
      .forRoutes(
        { path: 'admin/queues', method: RequestMethod.ALL },
        { path: 'admin/queues/(.*)', method: RequestMethod.ALL },
      );
  }
}
