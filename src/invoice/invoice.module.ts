import { Module } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { EventModule } from 'src/event/event.module';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';

@Module({
  imports: [EventModule],
  controllers: [InvoiceController],
  providers: [InvoiceService, AuthGuard],
})
export class InvoiceModule {}
