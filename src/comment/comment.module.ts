import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventModule } from 'src/event/event.module';

@Module({
  imports: [
      JwtModule.registerAsync({
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          secret: config.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: '60d' },
        }),
      }),
      EventModule,
    ],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
