import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { CacheUtil } from 'src/cache/redis-cache.util';
import { EventService } from 'src/event/event.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';

describe('BlogController', () => {
  let controller: BlogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogController],
      providers: [
        BlogService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: { blog: {} },
        },
        {
          provide: EventService,
          useValue: { emitSystemEvent: jest.fn() },
        },
        {
          provide: CacheUtil,
          useValue: {
            deleteByPattern: jest.fn(),
            getWithAutoRefresh: jest.fn().mockResolvedValue({ data: [], meta: {} }),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<BlogController>(BlogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
