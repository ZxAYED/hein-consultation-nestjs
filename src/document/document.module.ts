import { Module } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { EventModule } from 'src/event/event.module';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';

@Module({
  imports: [EventModule],
  controllers: [DocumentController],
  providers: [DocumentService, AuthGuard],
})
export class DocumentModule {}
