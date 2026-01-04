import { Module, forwardRef } from '@nestjs/common';
import { ActivityModule } from 'src/activity/activity.module';
import { NotificationModule } from 'src/notification/notification.module';
import { QueueModule } from 'src/queue/queue.module';
import { EventService } from './event.service';

@Module({
  imports: [ActivityModule, NotificationModule, forwardRef(() => QueueModule)],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
