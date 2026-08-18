import type { LearningGoal as PrismaLearningGoal, Student } from '@prisma/client';
import type { CreateLearningGoalPayload, GoalCategory, LearningGoal, UpdateLearningGoalPayload } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';

type GoalWithStudent = PrismaLearningGoal & { student: Student };

function toGoal(goal: GoalWithStudent): LearningGoal {
  return {
    id: goal.id,
    studentId: goal.studentId,
    studentName: goal.student.fullName,
    title: goal.title,
    category: goal.category as GoalCategory,
    progress: goal.progress,
    targetDate: goal.targetDate.toISOString(),
    createdAt: goal.createdAt.toISOString(),
  };
}

async function assertStudentOwnership(parentId: string, studentId: string): Promise<void> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.parentId !== parentId) {
    throw new AppError(404, 'Student not found', 'STUDENT_NOT_FOUND');
  }
}

async function assertGoalOwnership(parentId: string, goalId: string): Promise<GoalWithStudent> {
  const goal = await prisma.learningGoal.findUnique({ where: { id: goalId }, include: { student: true } });
  if (!goal || goal.student.parentId !== parentId) {
    throw new AppError(404, 'Learning goal not found', 'GOAL_NOT_FOUND');
  }
  return goal;
}

export async function createLearningGoal(parentId: string, payload: CreateLearningGoalPayload): Promise<LearningGoal> {
  await assertStudentOwnership(parentId, payload.studentId);

  const goal = await prisma.learningGoal.create({
    data: {
      studentId: payload.studentId,
      title: payload.title,
      category: payload.category,
      targetDate: new Date(payload.targetDate),
      progress: payload.progress ?? 0,
    },
    include: { student: true },
  });

  return toGoal(goal);
}

export async function listLearningGoals(parentId: string): Promise<LearningGoal[]> {
  const goals = await prisma.learningGoal.findMany({
    where: { student: { parentId } },
    include: { student: true },
    orderBy: { targetDate: 'asc' },
  });

  return goals.map(toGoal);
}

export async function updateLearningGoal(parentId: string, goalId: string, payload: UpdateLearningGoalPayload): Promise<LearningGoal> {
  await assertGoalOwnership(parentId, goalId);

  const goal = await prisma.learningGoal.update({
    where: { id: goalId },
    data: {
      title: payload.title,
      category: payload.category,
      targetDate: payload.targetDate ? new Date(payload.targetDate) : undefined,
      progress: payload.progress,
    },
    include: { student: true },
  });

  return toGoal(goal);
}

export async function deleteLearningGoal(parentId: string, goalId: string): Promise<void> {
  await assertGoalOwnership(parentId, goalId);
  await prisma.learningGoal.delete({ where: { id: goalId } });
}
