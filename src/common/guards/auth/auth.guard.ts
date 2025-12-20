// import {
//   CanActivate,
//   ExecutionContext,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { PrismaService } from 'src/prisma/prisma.service';

// @Injectable()
// export class AuthGuard implements CanActivate {
//   constructor(
//     private readonly jwtService: JwtService,
//     private readonly prisma: PrismaService,
//   ) {}
//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const request = context.switchToHttp().getRequest();
//     const token = request.headers.authorization;
//     if (token) {
//       // console.log(token);
//       const decoded = this.jwtService.decode(token);
//       if (decoded) {
//         // console.log(decoded)
//         const isUserExist = await this.prisma.user.findUnique({
//           where: { id: decoded['id'] },
//         });
//         if (!isUserExist) {
//           throw new UnauthorizedException('Unauthorized');
//         }
//         request['user'] = isUserExist;
//         return true;
//       } else {
//         throw new UnauthorizedException('Unauthorized');
//       }
//     }
//     throw new UnauthorizedException('Unauthorized');
//   }
// }


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

    const decoded = this.jwtService.decode(token);

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
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
