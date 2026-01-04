import { Test, TestingModule } from '@nestjs/testing';
import { CacheUtil } from 'src/cache/redis-cache.util';
import { EventService } from 'src/event/event.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BlogService } from './blog.service';

describe('BlogService', () => {
  let service: BlogService;

  beforeEach(async () => {
    const cacheUtilMock = {
      deleteByPattern: jest.fn(),
      getWithAutoRefresh: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
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
          useValue: cacheUtilMock,
        },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
