import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SlotStatus } from '@prisma/client';
import { Request } from 'express';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { ROLE } from 'src/user/entities/role.entity';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { GetSlotsQueryDto } from './dto/get-slots-query.dto';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}



  @Get('slots')
  @UseGuards(AuthGuard)
  getSlots(@Query() query: GetSlotsQueryDto) {
    return this.scheduleService.getSlotsByDay(query);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Post('generate')
  generate(
    @Body() generateSlotsDto: GenerateSlotsDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.scheduleService.generateSlots(generateSlotsDto, req.user.id);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Patch('slots/:id')
  disableSlot(@Param('id') id: string, @Body() body: { status: SlotStatus }) {
    return this.scheduleService.updateSlotStatus(id, body.status);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Delete('slots')
  deleteSlots(@Query() query: GetSlotsQueryDto) {
    return this.scheduleService.deleteSlotsByDay(query);
  }
}
