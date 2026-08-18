import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import prisma from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/AppError.js';

const router = Router();
router.use(requireAuth);
const reference = (prefix: string) => `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;

router.post('/disputes', validate(z.object({ body: z.object({ bookingId: z.string().min(1), reason: z.string().trim().min(3).max(120), description: z.string().trim().min(10).max(3000) }) })), asyncHandler(async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.body.bookingId } });
  if (!booking || (booking.parentId !== req.user!.id && booking.tutorId !== req.user!.id)) throw new AppError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  const existing = await prisma.dispute.findFirst({ where: { bookingId: booking.id, status: { in: ['OPEN', 'UNDER_REVIEW'] } } });
  if (existing) throw new AppError(409, 'An active dispute already exists for this booking.', 'DISPUTE_EXISTS');
  const dispute = await prisma.dispute.create({ data: { reference: reference('DSP'), bookingId: booking.id, openedById: req.user!.id, parentId: booking.parentId, tutorId: booking.tutorId, reason: req.body.reason, description: req.body.description, events: { create: { actorId: req.user!.id, action: 'OPENED', note: req.body.description } } } });
  res.status(201).json({ success: true, message: 'Dispute submitted', data: { dispute } });
}));

router.get('/disputes', asyncHandler(async (req, res) => {
  const disputes = await prisma.dispute.findMany({ where: { OR: [{ parentId: req.user!.id }, { tutorId: req.user!.id }] }, orderBy: { createdAt: 'desc' }, include: { events: { orderBy: { createdAt: 'asc' } } } });
  res.json({ success: true, message: 'OK', data: { disputes } });
}));

router.post('/support', validate(z.object({ body: z.object({ subject: z.string().trim().min(3).max(160), category: z.string().trim().min(2).max(80), message: z.string().trim().min(10).max(5000), bookingId: z.string().optional() }) })), asyncHandler(async (req, res) => {
  const ticket = await prisma.supportTicket.create({ data: { reference: reference('TKT'), userId: req.user!.id, subject: req.body.subject, category: req.body.category, bookingId: req.body.bookingId, messages: { create: { authorId: req.user!.id, body: req.body.message } } }, include: { messages: true } });
  res.status(201).json({ success: true, message: 'Support ticket created', data: { ticket } });
}));

router.get('/support', asyncHandler(async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({ where: { userId: req.user!.id }, orderBy: { updatedAt: 'desc' }, include: { messages: { where: { internal: false }, orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true, role: true, photoUrl: true } } } } } });
  res.json({ success: true, message: 'OK', data: { tickets } });
}));

router.post('/support/:id/messages', validate(z.object({ body: z.object({ body: z.string().trim().min(1).max(5000) }) })), asyncHandler(async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket || ticket.userId !== req.user!.id) throw new AppError(404, 'Support ticket not found', 'TICKET_NOT_FOUND');
  if (ticket.status === 'CLOSED') throw new AppError(409, 'This support ticket is closed.', 'TICKET_CLOSED');
  await prisma.$transaction([prisma.supportMessage.create({ data: { ticketId: ticket.id, authorId: req.user!.id, body: req.body.body } }), prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'OPEN' } })]);
  res.json({ success: true, message: 'Reply sent' });
}));

export default router;
