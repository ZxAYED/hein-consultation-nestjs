import { Module } from '@nestjs/common';

import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ActivityModule } from './activity/activity.module';
import { AdminGeneralModule } from './admin-general/admin-general.module';
import { AdminNotificationModule } from './admin-notification/admin-notification.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentModule } from './appointment/appointment.module';
import { BlogModule } from './blog/blog.module';
import { CommentModule } from './comment/comment.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentModule } from './document/document.module';
import { EventModule } from './event/event.module';
import { InvoiceModule } from './invoice/invoice.module';
import { NotificationModule } from './notification/notification.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';

import { ScheduleModules } from './schedule/schedule.module';
import { ServiceModule } from './service/service.module';
import { UserModule } from './user/user.module';

import { CacheModule } from './cache/cache.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ScheduleModules,
    AppointmentModule,
    BlogModule,
    DocumentModule,
    InvoiceModule,
    ActivityModule,
    NotificationModule,
    EventModule,
    AdminNotificationModule,
    DashboardModule,
    ServiceModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error('REDIS_URL is required for BullMQ');
        }

        return {
          connection: {
            url: redisUrl,
          },
        };
      },
    }),
    QueueModule,
    AdminGeneralModule,
    CommentModule,
    ScheduleModule.forRoot(),
    RedisModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
