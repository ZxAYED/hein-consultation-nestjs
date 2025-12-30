import { Module } from '@nestjs/common';

import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { ScheduleModule } from './schedule/schedule.module';
import { ServiceModule } from './service/service.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule,
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
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: Number(config.get('REDIS_PORT')),
        },
      }),
    }),
    QueueModule,
    AdminGeneralModule,
    CommentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
