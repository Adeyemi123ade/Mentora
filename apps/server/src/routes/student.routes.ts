import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { createStudentSchema, resetStudentPasswordSchema, updateStudentSchema } from '../validation/student.schemas.js';
import { photoUpload, extensionFor } from '../lib/upload.js';
import { AppError } from '../lib/AppError.js';
import * as studentService from '../services/student.service.js';
import * as storageService from '../services/storage.service.js';

const router = Router();

router.post('/', requireAuth, requireRole('PARENT'), validate(createStudentSchema), asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.createStudent(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Student profile created', data: { student } });
}));

router.get('/', requireAuth, requireRole('PARENT'), asyncHandler(async (req: Request, res: Response) => {
  const students = await studentService.listStudents(req.user!.id);
  res.json({ success: true, message: 'OK', data: { students } });
}));

router.patch('/:id', requireAuth, requireRole('PARENT'), validate(updateStudentSchema), asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.updateStudent(req.user!.id, req.params.id, req.body);
  res.json({ success: true, message: 'Student updated', data: { student } });
}));

router.delete('/:id', requireAuth, requireRole('PARENT'), asyncHandler(async (req: Request, res: Response) => {
  await studentService.deleteStudent(req.user!.id, req.params.id);
  res.json({ success: true, message: 'Student removed' });
}));

router.post('/:id/photo', requireAuth, requireRole('PARENT'), photoUpload.single('photo'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError(400, 'No photo file was provided', 'NO_FILE');

  const previousUrl = await studentService.getStudentPhotoUrl(req.user!.id, req.params.id);
  const path = `students/${req.params.id}-${Date.now()}.${extensionFor(req.file.mimetype)}`;
  const url = await storageService.uploadPhoto(path, req.file.buffer, req.file.mimetype);
  const student = await studentService.updateStudentPhoto(req.user!.id, req.params.id, url);
  await storageService.deletePhotoByUrl(previousUrl);
  res.json({ success: true, message: 'Photo updated', data: { student } });
}));

router.delete('/:id/photo', requireAuth, requireRole('PARENT'), asyncHandler(async (req: Request, res: Response) => {
  const previousUrl = await studentService.getStudentPhotoUrl(req.user!.id, req.params.id);
  const student = await studentService.updateStudentPhoto(req.user!.id, req.params.id, null);
  await storageService.deletePhotoByUrl(previousUrl);
  res.json({ success: true, message: 'Photo removed', data: { student } });
}));

router.post('/:id/reset-password', requireAuth, requireRole('PARENT'), validate(resetStudentPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.resetStudentPassword(req.user!.id, req.params.id, req.body.password);
  res.json({ success: true, message: 'Student password updated', data: { student } });
}));

export default router;
