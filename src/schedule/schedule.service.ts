import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SlotStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { GetSlotsQueryDto } from './dto/get-slots-query.dto';
import { ServiceName } from './entities/service-name.entity';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSlots(dto: GenerateSlotsDto, createdById?: string) {
    const date = this.parseDay(dto.date);
    const dayStart = this.combineDayAndTime(date, dto.startTime);
    const dayEnd = this.combineDayAndTime(date, dto.endTime);

    if (dto.durationMin <= 0) {
      throw new BadRequestException('durationMin must be greater than 0');
    }
    if (dayEnd <= dayStart) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const existingCount = await this.prisma.scheduleSlot.count({
      where: { serviceName: dto.serviceName, date },
    });

    if (existingCount > 0) {
      throw new ConflictException(
        'Slots already exist for this date & service',
      );
    }

    const slots: Array<{
      serviceName: ServiceName;
      date: Date;
      startTime: Date;
      endTime: Date;
      durationMin: number;
      status: SlotStatus;
      createdById?: string | null;
    }> = [];

    let currentStart = dayStart;
    while (this.addMinutes(currentStart, dto.durationMin) <= dayEnd) {
      const endTime = this.addMinutes(currentStart, dto.durationMin);
      slots.push({
        serviceName: dto.serviceName,
        date,
        startTime: currentStart,
        endTime,
        durationMin: dto.durationMin,
        status: SlotStatus.Available,
        createdById: createdById ?? null,
      });
      currentStart = endTime;
    }

    if (slots.length === 0) {
      throw new BadRequestException(
        'No slots can be generated for this window',
      );
    }

    const result = await this.prisma.scheduleSlot.createMany({
      data: slots,
    });

    return sendResponse('Slots generated successfully', {
      // createdCount: result.count,
      result,
    });
  }

  async getSlotsByDay(query: GetSlotsQueryDto) {
    const date = this.parseDay(query.date);
    const slots = await this.prisma.scheduleSlot.findMany({
      where: {
        serviceName: query.serviceName,
        date,
      },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    return sendResponse('Slots retrieved successfully', slots);
  }

  async updateSlotStatus(id: string, status: SlotStatus) {
    const slot = await this.prisma.scheduleSlot.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }
    if (slot.status === status) {
      throw new ConflictException(`Slot is already ${status}`);
    }
    if (!Object.values(SlotStatus).includes(status)) {
      throw new BadRequestException(
        `Invalid status , must be one of ${Object.values(SlotStatus).join(', ')}`,
      );
    }
    await this.prisma.scheduleSlot.update({
      where: { id },
      data: { status: status },
    });

    return sendResponse(`Slot ${status} updated successfully`);
  }

  private parseDay(dateStr: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!match) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return date;
  }

  private combineDayAndTime(day: Date, timeStr: string) {
    const match = /^(\d{2}):(\d{2})$/.exec(timeStr);
    if (!match) {
      throw new BadRequestException('time must be in HH:mm format');
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException('Invalid time');
    }

    return new Date(
      Date.UTC(
        day.getUTCFullYear(),
        day.getUTCMonth(),
        day.getUTCDate(),
        hours,
        minutes,
        0,
        0,
      ),
    );
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60_000);
  }
}
