# Redis Cache & Centralized Notification System Guide

This guide details how to implement a high-performance **Redis Cache** and a **Scalable Notification System** that moves away from single-server in-memory "HashMaps" to a centralized Redis architecture.

## 1. Redis Cache Architecture

Instead of fetching data from the Database (Postgres) every time, we use Redis to store frequently accessed data (like Blog Posts, User Profiles, Settings).

### The Pattern: Stale-While-Revalidate (Background Refresh)
We use a smart caching strategy called "Stale-While-Revalidate" implemented in `CacheUtil`.
1.  **Check Cache**: If data exists, return it immediately (Fast ⚡).
2.  **Background Refresh**: If the data is "stale" (or just to keep it fresh), we fetch the latest from DB in the background and update Redis.
3.  **Fallback**: If no cache, fetch from DB and set cache.

### Implementation
**File:** `src/cache/redis-cache.util.ts`

```typescript
// ... (imports)

@Injectable()
export class CacheUtil {
  constructor(private readonly redisService: RedisService) {}

  async getWithAutoRefresh<T>(
    key: string,
    fetchFn: () => Promise<T>, // The function to call if cache is empty/stale
    ttlSeconds = 120,
  ): Promise<T> {
    const cached = await this.client.get(key);

    if (cached) {
      const parsed = JSON.parse(cached);
      
      // ⚡ Return cached data immediately
      // 🔁 Trigger background refresh logic here (omitted for brevity)
      return parsed; 
    }

    // ❌ Cache Miss: Fetch from DB
    const freshData = await fetchFn();
    await this.client.set(key, JSON.stringify(freshData), 'EX', ttlSeconds);
    return freshData;
  }
}
```

### How to Use It (Example: Blog Service)
In your service, wrap your DB calls with `getWithAutoRefresh`.

**File:** `src/blog/blog.service.ts`

```typescript
async findAll() {
  const cacheKey = 'all_blogs';
  
  return this.cacheUtil.getWithAutoRefresh(
    cacheKey,
    async () => {
      // This DB call only happens if cache is missing or refreshing
      return await this.prisma.blog.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' }
      });
    },
    300 // TTL: 5 minutes
  );
}
```

---

## 2. Centralized Notification System (Redis Pub/Sub)

### The Problem with "HashMaps"
In a standard WebSocket app, you store connected users in a local variable:
`const connectedUsers = new Map<UserId, Socket>();`

**The Limitation:** If you scale to 2 servers (Server A, Server B), Server A doesn't know about users connected to Server B. You can't send notifications to users on the other server.

### The Solution: Redis Pub/Sub
We use Redis as a "Message Broker".
1.  **Server A** generates a notification.
2.  **Server A** publishes it to a Redis Channel (`notifications`).
3.  **ALL Servers** (A and B) subscribe to this channel.
4.  Each server receives the message and checks: "Is this user connected to *me*?"
5.  If yes, send the WebSocket message.

### Architecture Diagram

```mermaid
graph TD
    Trigger[Event Trigger (e.g. Invoice Paid)] -->|1. Emit| Gateway[NotificationGateway]
    Gateway -->|2. Publish| Redis[(Redis Pub/Sub)]
    
    Redis -->|3. Broadcast| Instance1[Server Instance 1]
    Redis -->|3. Broadcast| Instance2[Server Instance 2]
    
    subgraph Instance 1
        Instance1 -->|Check Map| LocalMap1[Local Clients Map]
        LocalMap1 -->|Found| ClientA[User A Phone]
    end
    
    subgraph Instance 2
        Instance2 -->|Check Map| LocalMap2[Local Clients Map]
        LocalMap2 -->|Found| ClientB[User B Laptop]
    end
```

### Core Implementation
**File:** `src/notification/notification.gateway.ts`

```typescript
@WebSocketGateway({ path: '/ws/notifications' })
export class NotificationGateway implements OnModuleInit {
  // Local Map (still needed for final delivery, but not for global state)
  private readonly clientsByUser = new Map<string, Set<WebSocket>>();
  private subClient: Redis;
  private pubClient: Redis;

  async onModuleInit() {
    // 1. Connect to Redis
    this.subClient = this.redisService.getClient().duplicate();
    await this.subClient.subscribe('notifications');

    // 2. Listen for Global Messages
    this.subClient.on('message', (channel, message) => {
      this.handleRedisMessage(message);
    });
  }

  // Called when we want to notify a user
  emitNotification(notification: Notification) {
    // 3. Publish to Redis (instead of just looking locally)
    const message = JSON.stringify({ notification });
    this.pubClient.publish('notifications', message);
  }

  // 4. Handle Broadcast (Runs on EVERY server)
  private handleRedisMessage(rawMessage: string) {
    const { notification } = JSON.parse(rawMessage);
    
    // Check if user is connected to THIS server
    const userSockets = this.clientsByUser.get(notification.userId);
    
    if (userSockets) {
      // 5. Deliver to User
      for (const socket of userSockets) {
        socket.send(JSON.stringify(notification));
      }
    }
  }
}
```

---

## 3. Advanced: Storing User Presence (Online/Offline)
If you want to know "Who is online?" without asking every server, store it in Redis Sets.

### Concept
*   **User Connects**: `SADD online_users {userId}`
*   **User Disconnects**: `SREM online_users {userId}`
*   **Check Status**: `SISMEMBER online_users {userId}`

### Implementation Guide

**File:** `src/notification/notification.gateway.ts` (Additions)

```typescript
async handleConnection(client: WebSocket, req: IncomingMessage) {
  const userId = this.extractUserId(req);
  
  // Add to Redis Set
  await this.redisService.getClient().sadd('online_users', userId);
  
  // Store locally for delivery
  this.clientsByUser.set(userId, client);
}

async handleDisconnect(client: WebSocket) {
  const userId = this.getUserId(client);
  
  // Remove from Redis Set
  await this.redisService.getClient().srem('online_users', userId);
  
  // Remove locally
  this.clientsByUser.delete(userId);
}
```

---

## 4. Advanced: Notification Feed Cache (Redis Lists)
Instead of querying Postgres for "Last 10 notifications" every time a user opens the app, use Redis Lists.

### Concept
*   **New Notification**: `LPUSH notifications:{userId} {notificationJson}`
*   **Trim List**: `LTRIM notifications:{userId} 0 99` (Keep only last 100)
*   **Get Feed**: `LRANGE notifications:{userId} 0 10` (Super fast)

### Implementation Guide

**File:** `src/notification/notification.service.ts`

```typescript
async createNotification(data: CreateNotificationDto) {
  // 1. Save to DB (Permanent Record)
  const notification = await this.prisma.notification.create({ data });

  // 2. Push to Redis List (Fast Access Cache)
  const redis = this.redisService.getClient();
  const key = `notifications:${data.userId}`;
  
  await redis.lpush(key, JSON.stringify(notification));
  await redis.ltrim(key, 0, 99); // Limit to 100 items

  // 3. Emit Real-time
  this.notificationGateway.emitNotification(notification);
  
  return notification;
}

async getRecentNotifications(userId: string) {
  const redis = this.redisService.getClient();
  const cached = await redis.lrange(`notifications:${userId}`, 0, 20);
  
  if (cached.length > 0) {
    return cached.map(item => JSON.parse(item));
  }
  
  // Fallback to DB if empty
  return this.prisma.notification.findMany({ 
    where: { userId }, 
    take: 20, 
    orderBy: { createdAt: 'desc' } 
  });
}
```

## Code References
- [redis-cache.util.ts](file:///c:/Zayed/marcus-backend-nestjs/src/cache/redis-cache.util.ts)
- [notification.gateway.ts](file:///c:/Zayed/marcus-backend-nestjs/src/notification/notification.gateway.ts)
- [notification.service.ts](file:///c:/Zayed/marcus-backend-nestjs/src/notification/notification.service.ts)
