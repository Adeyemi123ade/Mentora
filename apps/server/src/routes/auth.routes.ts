import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { resetPasswordRateLimit, signupRateLimit, resendOtpRateLimit, studentLoginRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { resetPasswordSchema, signupSchema, resendOtpSchema, studentLoginSchema } from '../validation/auth.schemas.js';
import * as authService from '../services/auth.service.js';

const router = Router();

router.post('/student-login', studentLoginRateLimit, validate(studentLoginSchema), asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.signInStudent(req.body.loginId, req.body.password);
  res.json({ success: true, message: 'Signed in', data: result });
}));

router.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  res.json({ success: true, message: 'OK', data: { user } });
}));

router.post('/logout', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.user!.id);
  res.json({ success: true, message: 'Logged out' });
}));

router.post('/reset-password', resetPasswordRateLimit, validate(resetPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  await authService.requestPasswordReset(req.body.email);
  res.json({
    success: true,
    message: 'If an account exists for that email, a password reset link has been sent.',
  });
}));

router.post('/signup', signupRateLimit, validate(signupSchema), asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.signup(req.body);
  res.status(201).json({
    success: true,
    message: 'Account created. Check your email for your 6-digit verification code.',
    data: { user },
  });
}));

router.post('/resend-otp', resendOtpRateLimit, validate(resendOtpSchema), asyncHandler(async (req: Request, res: Response) => {
  await authService.sendSignupOtp(req.body.email);
  res.json({ success: true, message: 'A new verification code has been sent.' });
}));

export default router;
