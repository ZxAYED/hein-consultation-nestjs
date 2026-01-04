import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BullBoardAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const authorization = req.headers.authorization;
    if (!authorization) {
      throw new UnauthorizedException('Unauthorized');
    }

    const rawToken = authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : authorization;

    const decoded: unknown = this.jwtService.decode(rawToken);
    if (!decoded || typeof decoded !== 'object' || decoded === null) {
      throw new UnauthorizedException('Unauthorized');
    }

    const decodedRecord = decoded as Record<string, unknown>;
    const userId = typeof decodedRecord.id === 'string' ? decodedRecord.id : null;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    next();
  }
}

