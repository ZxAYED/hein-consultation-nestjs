import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';

@Module({
  controllers: [AppointmentController],
  providers: [AppointmentService, AuthGuard],
})
export class AppointmentModule {}
