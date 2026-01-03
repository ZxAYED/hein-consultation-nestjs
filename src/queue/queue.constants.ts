export const QUEUE = {
  ACTIVITIES: 'activities',
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages',
  EVENTS: 'events',
  EMAILS: 'emails',
} as const;

export const JOB = {
  ACTIVITY_CREATE: 'activity.create',
  SYSTEM_EVENT: 'system.event',
  ADMIN_EVENT: 'admin.event',
  SEND_EMAIL: 'email.send',
  NOTIFICATION_EMIT: 'notification.emit',
  NOTIFICATION_CREATE: 'notification.create',
};
