import { Module } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService, AuthGuard],
})
export class DocumentModule {}
