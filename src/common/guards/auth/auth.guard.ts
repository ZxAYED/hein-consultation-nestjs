

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/common/decorator/rolesDecorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector, // decorator metadata access
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    const decoded = this.jwtService.verify(token);
    // console.log("🚀 ~ AuthGuard ~ canActivate ~ decoded:", decoded)
    

    if (!decoded) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded['id'] },
    });

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    request['user'] = user;

    // ===== Role check =====
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`${user.role} is not allowed to access this route`);
    }

    return true;
  }
}
