import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentModule } from './appointment/appointment.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule } from './schedule/schedule.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true, // 👈 সব module থেকে access
    }),
    ScheduleModule,
    AppointmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
