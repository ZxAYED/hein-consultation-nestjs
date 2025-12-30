import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { QueueModule } from 'src/queue/queue.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    QueueModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60d' },
      }),
    }),
  ],
  controllers: [UserController],
  providers: [UserService, AuthGuard],
})
export class UserModule {}
