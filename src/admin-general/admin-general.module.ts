import { Module } from '@nestjs/common';
import { AdminGeneralService } from './admin-general.service';
import { AdminGeneralController } from './admin-general.controller';

@Module({
  controllers: [AdminGeneralController],
  providers: [AdminGeneralService],
})
export class AdminGeneralModule {}
