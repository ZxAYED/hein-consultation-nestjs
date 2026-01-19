import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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
import { RedisService } from 'src/redis/redis.service';
import { Server, WebSocket } from 'ws';

type ClientContext = {
  userId: string;
  role: UserRole;
};

type NotificationMessage = {
  originId: string;
  notification: Notification;
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
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly clients = new Map<WebSocket, ClientContext>();
  private readonly clientsByUser = new Map<string, Set<WebSocket>>();
  private readonly adminClients = new Set<WebSocket>();
  private readonly instanceId = Math.random().toString(36).slice(2);
  private readonly channel = 'notifications';
  private pubClient?: ReturnType<RedisService['getClient']>;
  private subClient?: ReturnType<RedisService['getClient']>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    try {
      this.pubClient = this.redisService.getClient();
      this.subClient = this.pubClient.duplicate();
      await this.subClient.connect();
      await this.subClient.subscribe(this.channel);
      this.subClient.on('message', (_channel, message) => {
        this.handleRedisMessage(message);
      });
    } catch {
      // Redis is optional for single-instance use; continue without it.
      this.pubClient = undefined;
      this.subClient = undefined;
    }
  }

  async onModuleDestroy() {
    await this.subClient?.quit();
  }

  async handleConnection(client: WebSocket, request?: IncomingMessage) {
    const token = this.extractToken(request);
    if (!token) {
      this.send(client, 'auth_error', { message: 'Unauthorized : Invalid token' });
      client.close();
      return;
    }

    const decoded = this.jwtService.decode(token);
    if (!decoded || typeof decoded !== 'object') {
      this.send(client, 'auth_error', { message: 'Unauthorized: Invalid token' });
      client.close();
      return;
    }

    const decodedRecord = decoded as Record<string, unknown>;
    const userId =
      typeof decodedRecord.id === 'string' ? decodedRecord.id : null;

    if (!userId) {
      this.send(client, 'auth_error', { message: 'Unauthorized: Invalid token' });
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
      this.send(client, 'auth_error', { message: 'Connection failed: Database unavailable or this user is not found ' });
      client.close();
      return;
    }

    if (!user) {
      this.send(client, 'auth_error', { message: 'Unauthorized: Invalid token' });
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
    if (this.pubClient) {
      const message: NotificationMessage = {
        originId: this.instanceId,
        notification,
      };
      this.pubClient.publish(this.channel, JSON.stringify(message));
    } else {
      this.emitLocal(notification);
    }
  }

  private emitLocal(notification: Notification) {
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
        isAdminRead: true;
        isCustomerRead: true;
        metadata: true;
        createdAt: true;
      };
    }> = {
      id: notification.id,
      userId: notification.userId,
      event: notification.event,
      title: notification.title,
      message: notification.message,
      isAdminRead: notification.isAdminRead,
      isCustomerRead: notification.isCustomerRead,
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

  private handleRedisMessage(message: string) {
    try {
      const parsed = JSON.parse(message) as NotificationMessage;
      if (parsed.originId === this.instanceId) {
        return;
      }
      this.emitLocal(parsed.notification);
    } catch {
      // Ignore malformed payloads.
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

  private extractToken(request?: IncomingMessage): string | null {
    if (!request) return null;

    const authHeader = request.headers.authorization;
    if (authHeader) {
      const value = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      return value.startsWith('Bearer ') ? value.slice(7) : value;
    }

    //  Query param fallback
    if (request.url) {
      const queryIndex = request.url.indexOf('?');
      if (queryIndex !== -1) {
        const params = new URLSearchParams(request.url.slice(queryIndex));
        return params.get('token');
      }
    }

    return null;
  }
}
