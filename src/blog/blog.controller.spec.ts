import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
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
