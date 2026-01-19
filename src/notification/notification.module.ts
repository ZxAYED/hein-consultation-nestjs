import { Module } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { RedisModule } from 'src/redis/redis.module';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

@Module({
  imports: [RedisModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway, AuthGuard],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
