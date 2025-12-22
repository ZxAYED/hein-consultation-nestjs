import { Module } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService, AuthGuard],
})
export class ScheduleModule {}
