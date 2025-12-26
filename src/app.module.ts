import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentModule } from './appointment/appointment.module';
import { DocumentModule } from './document/document.module';
import { ActivityModule } from './activity/activity.module';
import { AdminNotificationModule } from './admin-notification/admin-notification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EventModule } from './event/event.module';
import { InvoiceModule } from './invoice/invoice.module';
import { NotificationModule } from './notification/notification.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule } from './schedule/schedule.module';
import { UserModule } from './user/user.module';

import { BlogModule } from './blog/blog.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
