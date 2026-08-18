import type { LoginEventType } from '@prisma/client';
import type { LoginEventDto } from '@mentora/shared';
import prisma from '../db.js';

const RETENTION_DAYS = 90;
const PRUNE_PROBABILITY = 0.05;

export async function logEvent(userId: string, action: LoginEventType): Promise<void> {
  await prisma.loginEvent.create({ data: { userId, action } });

  // Keep the table bounded: periodically drop events older than the retention window.
  if (Math.random() < PRUNE_PROBABILITY) {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.loginEvent
      .deleteMany({ where: { createdAt: { lt: cutoff } } })
      .catch((err) => console.warn('[loginEvent] failed to prune old events:', err));
  }
}

export async function listRecentEvents(limit = 100): Promise<LoginEventDto[]> {
  const events = await prisma.loginEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { name: true, email: true, role: true } } },
  });

  return events.map((e) => ({
    id: e.id,
    userName: e.user.name,
    userEmail: e.user.email,
    userRole: e.user.role,
    action: e.action,
    createdAt: e.createdAt.toISOString(),
  }));
}
