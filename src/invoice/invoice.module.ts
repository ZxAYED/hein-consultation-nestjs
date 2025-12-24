import { Module } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';

@Module({
  controllers: [InvoiceController],
  providers: [InvoiceService, AuthGuard],
})
export class InvoiceModule {}
