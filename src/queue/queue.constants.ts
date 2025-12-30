export const QUEUE = {
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages',
  EVENTS: 'events',
  EMAILS: 'emails',
} as const;

export const JOB = {
  SYSTEM_EVENT: 'system.event',
  ADMIN_EVENT: 'admin.event',
  SEND_EMAIL: 'email.send',
  NOTIFICATION_EMIT: 'notification.emit',
  NOTIFICATION_CREATE: 'notification.create',
};
