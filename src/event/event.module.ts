import { Module } from '@nestjs/common';
import { ActivityModule } from 'src/activity/activity.module';
import { NotificationModule } from 'src/notification/notification.module';
import { EventService } from './event.service';

@Module({
  imports: [ActivityModule, NotificationModule],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
