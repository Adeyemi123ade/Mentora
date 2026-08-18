import type { Conversation, Message as PrismaMessage, User } from '@prisma/client';
import type { ConversationSummary, MessageDto, SendMessagePayload } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';

type Viewer = { id: string; role: string };

function toParticipant(user: Pick<User, 'id' | 'name' | 'photoUrl'>) {
  return { id: user.id, name: user.name, photoUrl: user.photoUrl, title: null as string | null };
}

async function assertParticipant(conversation: Conversation, viewer: Viewer): Promise<void> {
  const isParent = conversation.parentId === viewer.id;
  const isTutor = conversation.tutorId === viewer.id;
  if (!isParent && !isTutor) {
    throw new AppError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND');
  }
}

export async function listConversations(viewer: Viewer): Promise<ConversationSummary[]> {
  const where = viewer.role === 'TUTOR' ? { tutorId: viewer.id } : { parentId: viewer.id };

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      parent: { select: { id: true, name: true, photoUrl: true } },
      tutor: { select: { id: true, name: true, photoUrl: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  const unreadCounts = await prisma.message.groupBy({
    by: ['conversationId'],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: viewer.id },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, u._count._all]));

  return conversations.map((c) => {
    const counterpartUser = viewer.role === 'TUTOR' ? c.parent : c.tutor;
    const lastMessage = c.messages[0];
    return {
      id: c.id,
      counterpart: toParticipant(counterpartUser),
      lastMessagePreview: lastMessage ? lastMessage.body : '',
      lastMessageAt: (lastMessage ? lastMessage.createdAt : c.createdAt).toISOString(),
      unreadCount: unreadMap.get(c.id) ?? 0,
    };
  });
}

export async function startConversation(viewer: Viewer, counterpartId: string): Promise<ConversationSummary> {
  let parentId: string;
  let tutorId: string;

  if (viewer.role === 'PARENT') {
    const counterpart = await prisma.user.findFirst({ where: { id: counterpartId, role: 'TUTOR', accountStatus: 'ACTIVE' } });
    if (!counterpart) {
      throw new AppError(404, 'Tutor not found', 'TUTOR_NOT_FOUND');
    }
    const hasBooking = await prisma.booking.findFirst({
      where: { parentId: viewer.id, tutorId: counterpartId, status: { not: 'CANCELLED' } },
      select: { id: true },
    });
    if (!hasBooking) {
      throw new AppError(403, 'You can message this tutor after booking a session with them', 'NO_RELATIONSHIP');
    }
    parentId = viewer.id;
    tutorId = counterpartId;
  } else if (viewer.role === 'TUTOR') {
    const hasBooking = await prisma.booking.findFirst({ where: { tutorId: viewer.id, parentId: counterpartId } });
    if (!hasBooking) {
      throw new AppError(403, 'You can only message parents you have a booking with', 'NO_RELATIONSHIP');
    }
    parentId = counterpartId;
    tutorId = viewer.id;
  } else {
    throw new AppError(403, 'Only parents and tutors can use messages', 'ROLE_NOT_ALLOWED');
  }

  const conversation = await prisma.conversation.upsert({
    where: { parentId_tutorId: { parentId, tutorId } },
    update: {},
    create: { parentId, tutorId },
    include: {
      parent: { select: { id: true, name: true, photoUrl: true } },
      tutor: { select: { id: true, name: true, photoUrl: true } },
    },
  });

  const counterpartUser = viewer.role === 'TUTOR' ? conversation.parent : conversation.tutor;
  return {
    id: conversation.id,
    counterpart: toParticipant(counterpartUser),
    lastMessagePreview: '',
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    unreadCount: 0,
  };
}

function toMessageDto(message: PrismaMessage & { student: { fullName: string } | null }, viewerId: string): MessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderIsMe: message.senderId === viewerId,
    body: message.body,
    studentId: message.studentId,
    studentName: message.student?.fullName ?? null,
    readAt: message.readAt ? message.readAt.toISOString() : null,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function listMessages(viewer: Viewer, conversationId: string): Promise<MessageDto[]> {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new AppError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND');
  await assertParticipant(conversation, viewer);

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: viewer.id }, readAt: null },
    data: { readAt: new Date() },
  });

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: { student: { select: { fullName: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return messages.map((m) => toMessageDto(m, viewer.id));
}

export async function sendMessage(viewer: Viewer, conversationId: string, payload: SendMessagePayload): Promise<MessageDto> {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new AppError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND');
  await assertParticipant(conversation, viewer);

  let studentId: string | null = null;
  if (payload.studentId) {
    if (viewer.role !== 'TUTOR') {
      throw new AppError(403, 'Only tutors can tag a message to a student', 'NOTE_NOT_ALLOWED');
    }
    const student = await prisma.student.findUnique({ where: { id: payload.studentId } });
    if (!student || student.parentId !== conversation.parentId) {
      throw new AppError(404, 'Student not found', 'STUDENT_NOT_FOUND');
    }
    studentId = student.id;
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: viewer.id,
      body: payload.body,
      studentId,
    },
    include: { student: { select: { fullName: true } } },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: message.createdAt },
  });

  return toMessageDto(message, viewer.id);
}

export async function getUnreadCount(viewer: Viewer): Promise<number> {
  const where = viewer.role === 'TUTOR' ? { tutorId: viewer.id } : { parentId: viewer.id };
  const conversations = await prisma.conversation.findMany({ where, select: { id: true } });
  if (conversations.length === 0) return 0;

  return prisma.message.count({
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: viewer.id },
      readAt: null,
    },
  });
}

export async function listMessageableStudents(viewer: Viewer, conversationId: string): Promise<{ id: string; fullName: string }[]> {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new AppError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND');
  await assertParticipant(conversation, viewer);
  if (viewer.role !== 'TUTOR') return [];

  const students = await prisma.student.findMany({
    where: {
      parentId: conversation.parentId,
      bookings: { some: { tutorId: conversation.tutorId, status: { not: 'CANCELLED' } } },
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });
  return students;
}

export async function listMessageableParents(viewer: Viewer): Promise<{ id: string; name: string }[]> {
  if (viewer.role !== 'TUTOR') return [];

  const bookings = await prisma.booking.findMany({
    where: { tutorId: viewer.id },
    select: { parent: { select: { id: true, name: true } } },
    distinct: ['parentId'],
  });
  return bookings.map((b) => b.parent);
}

export async function listMessageableTutors(viewer: Viewer): Promise<{ id: string; name: string; photoUrl: string | null; title: string | null }[]> {
  if (viewer.role !== 'PARENT') return [];

  const bookings = await prisma.booking.findMany({
    where: { parentId: viewer.id, status: { not: 'CANCELLED' } },
    select: {
      tutor: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
          tutorProfile: { select: { professionalTitle: true, photoUrl: true } },
        },
      },
    },
    distinct: ['tutorId'],
  });
  return bookings.map(({ tutor }) => ({
    id: tutor.id,
    name: tutor.name,
    photoUrl: tutor.tutorProfile?.photoUrl ?? tutor.photoUrl,
    title: tutor.tutorProfile?.professionalTitle ?? null,
  }));
}
