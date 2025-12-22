import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

describe('ScheduleController', () => {
  let controller: ScheduleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [
        ScheduleService,
        {
          provide: PrismaService,
          useValue: {
            scheduleSlot: {},
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ScheduleController>(ScheduleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
