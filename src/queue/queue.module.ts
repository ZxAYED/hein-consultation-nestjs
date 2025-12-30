import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventModule } from 'src/event/event.module';

import { EventProcessor } from './processors/event.processors';
import { EmailProducer } from './producers/email.producer';
import { EventProducer } from './producers/event.producer';
import { QUEUE } from './queue.constants';

@Module({
  imports: [
    ConfigModule,
    EventModule, // IMPORTANT (to reuse EventService)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: Number(config.get('REDIS_PORT')),
        },
      }),
    }),
    BullModule.registerQueue({ name: QUEUE.EVENTS }, { name: QUEUE.EMAILS }),
  ],
  providers: [EventProducer, EmailProducer, EventProcessor, EmailProcessor],
  exports: [EventProducer, EmailProducer],
})
export class QueueModule {}
