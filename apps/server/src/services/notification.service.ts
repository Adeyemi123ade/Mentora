import type { Notification as PrismaNotification } from '@prisma/client';
import type { Notification } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';

function toNotification(notification: PrismaNotification): Notification {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function listNotifications(userId: string): Promise<Notification[]> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return notifications.map(toNotification);
}

export async function markAsRead(userId: string, notificationId: string): Promise<Notification> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== userId) {
    throw new AppError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: notification.readAt ?? new Date() },
  });

  return toNotification(updated);
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
