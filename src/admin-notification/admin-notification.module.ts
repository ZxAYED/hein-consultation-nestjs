import { Module } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { EventModule } from 'src/event/event.module';
import { AdminNotificationController } from './admin-notification.controller';

@Module({
  imports: [EventModule],
  controllers: [AdminNotificationController],
  providers: [AuthGuard],
})
export class AdminNotificationModule {}
