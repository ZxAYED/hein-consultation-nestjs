import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { EventService } from 'src/event/event.service';
import { ROLE } from 'src/user/entities/role.entity';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';

@Controller('admin/notifications')
export class AdminNotificationController {
  constructor(private readonly eventService: EventService) {}

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Post()
  async create(
    @Body() dto: CreateAdminNotificationDto,
    @Req() req: Request & { user: { id: string; role: UserRole } },
  ) {
    if (!dto.broadcast && (!dto.userIds || dto.userIds.length === 0)) {
      throw new BadRequestException(
        'userIds must be provided when broadcast is false',
      );
    }

    return this.eventService.emitAdminEvent({
      actorId: req.user.id,
      title: dto.title,
      message: dto.message,
      userIds: dto.userIds,
      broadcast: dto.broadcast,
      metadata: dto.metadata,
    });
  }
}
