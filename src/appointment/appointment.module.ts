import { Module } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { EventModule } from 'src/event/event.module';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';

@Module({
  imports: [EventModule],
  controllers: [AppointmentController],
  providers: [AppointmentService, AuthGuard],
})
export class AppointmentModule {}
