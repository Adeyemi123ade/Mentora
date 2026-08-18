import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { createLearningGoalSchema, updateLearningGoalSchema } from '../validation/learningGoal.schemas.js';
import * as learningGoalService from '../services/learningGoal.service.js';

const router = Router();

router.post('/', requireAuth, validate(createLearningGoalSchema), asyncHandler(async (req: Request, res: Response) => {
  const goal = await learningGoalService.createLearningGoal(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Learning goal created', data: { goal } });
}));

router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const goals = await learningGoalService.listLearningGoals(req.user!.id);
  res.json({ success: true, message: 'OK', data: { goals } });
}));

router.patch('/:id', requireAuth, validate(updateLearningGoalSchema), asyncHandler(async (req: Request, res: Response) => {
  const goal = await learningGoalService.updateLearningGoal(req.user!.id, req.params.id, req.body);
  res.json({ success: true, message: 'Learning goal updated', data: { goal } });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  await learningGoalService.deleteLearningGoal(req.user!.id, req.params.id);
  res.json({ success: true, message: 'Learning goal removed' });
}));

export default router;
