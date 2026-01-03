import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Notification, Prisma, UserRole } from '@prisma/client';
import type { IncomingMessage } from 'http';
import { PrismaService } from 'src/prisma/prisma.service';
import { Server, WebSocket } from 'ws';

type ClientContext = {
  userId: string;
  role: UserRole;
};

@WebSocketGateway({
  path: '/ws/notifications',
  cors: {
    origin: [
      '*',
      'https://marcus-hein-alpha.vercel.app',
      'http://localhost:5173',
    ],
  },
})
@Injectable()
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly clients = new Map<WebSocket, ClientContext>();
  private readonly clientsByUser = new Map<string, Set<WebSocket>>();
  private readonly adminClients = new Set<WebSocket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: WebSocket, request?: IncomingMessage) {
    const token = this.extractToken(request);
    if (!token) {
      this.send(client, 'auth_error', { message: 'Unauthorized' });
      client.close();
      return;
    }

    const decoded = this.jwtService.decode(token);
    if (!decoded || typeof decoded !== 'object') {
      this.send(client, 'auth_error', { message: 'Unauthorized' });
      client.close();
      return;
    }

    const decodedRecord = decoded as Record<string, unknown>;
    const userId =
      typeof decodedRecord.id === 'string' ? decodedRecord.id : null;

    if (!userId) {
      this.send(client, 'auth_error', { message: 'Unauthorized' });
      client.close();
      return;
    }

    let user: { id: string; role: UserRole } | null = null;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });
    } catch {
      this.send(client, 'auth_error', { message: 'Database unavailable' });
      client.close();
      return;
    }

    if (!user) {
      this.send(client, 'auth_error', { message: 'Unauthorized' });
      client.close();
      return;
    }

    this.trackClient(client, { userId: user.id, role: user.role });
    this.send(client, 'connected', { userId: user.id, role: user.role });
  }

  handleDisconnect(client: WebSocket) {
    this.untrackClient(client);
  }

  emitNotification(notification: Notification) {
    const targets = new Set<WebSocket>();
    const userClients = this.clientsByUser.get(notification.userId);
    if (userClients) {
      for (const socket of userClients) {
        targets.add(socket);
      }
    }
    for (const socket of this.adminClients) {
      targets.add(socket);
    }

    if (!targets.size) {
      return;
    }

    const payload: Prisma.NotificationGetPayload<{
      select: {
        id: true;
        userId: true;
        event: true;
        title: true;
        message: true;
        isRead: true;
        metadata: true;
        createdAt: true;
      };
    }> = {
      id: notification.id,
      userId: notification.userId,
      event: notification.event,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    };

    const message = JSON.stringify({
      event: 'notification:new',
      data: payload,
    });

    for (const socket of targets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }

  private trackClient(client: WebSocket, context: ClientContext) {
    this.clients.set(client, context);

    let userSet = this.clientsByUser.get(context.userId);
    if (!userSet) {
      userSet = new Set();
      this.clientsByUser.set(context.userId, userSet);
    }
    userSet.add(client);

    if (context.role === UserRole.ADMIN) {
      this.adminClients.add(client);
    }
  }

  private untrackClient(client: WebSocket) {
    const context = this.clients.get(client);
    if (!context) {
      return;
    }

    this.clients.delete(client);

    const userSet = this.clientsByUser.get(context.userId);
    if (userSet) {
      userSet.delete(client);
      if (!userSet.size) {
        this.clientsByUser.delete(context.userId);
      }
    }

    if (context.role === UserRole.ADMIN) {
      this.adminClients.delete(client);
    }
  }

  private send(
    client: WebSocket,
    event: string,
    data: Record<string, unknown>,
  ) {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }
    client.send(JSON.stringify({ event, data }));
  }

  private extractToken(request?: IncomingMessage) {
    if (!request) {
      return null;
    }

    const authHeader = request.headers.authorization;
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (headerValue) {
      return headerValue.startsWith('Bearer ')
        ? headerValue.slice(7)
        : headerValue;
    }

    if (!request.url) {
      return null;
    }

    let token: string | null = null;
    try {
      const url = new URL(request.url, 'http://localhost');
      token = url.searchParams.get('token');
    } catch {
      token = null;
    }

    return token;
  }
}
