import prisma from '../db.js';

export async function logTutorView(parentId: string, tutorId: string): Promise<void> {
  await prisma.tutorView.upsert({
    where: { parentId_tutorId: { parentId, tutorId } },
    update: { viewedAt: new Date() },
    create: { parentId, tutorId },
  });
}

export async function countRecentlyViewed(parentId: string, sinceDays: number): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  return prisma.tutorView.count({ where: { parentId, viewedAt: { gte: since } } });
}
