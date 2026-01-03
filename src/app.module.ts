import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivityModule } from './activity/activity.module';
import { AdminNotificationModule } from './admin-notification/admin-notification.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentModule } from './appointment/appointment.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentModule } from './document/document.module';
import { EventModule } from './event/event.module';
import { InvoiceModule } from './invoice/invoice.module';
import { NotificationModule } from './notification/notification.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModules } from './schedule/schedule.module';
import { UserModule } from './user/user.module';

import { BlogModule } from './blog/blog.module';
import { ServiceModule } from './service/service.module';
import { AdminGeneralModule } from './admin-general/admin-general.module';
import { CommentModule } from './comment/comment.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from './redis/redis.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
