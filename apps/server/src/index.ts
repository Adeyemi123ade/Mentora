import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './env.js';
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
import studentRouter from './routes/student.routes.js';
import notificationRouter from './routes/notification.routes.js';
import userRouter from './routes/user.routes.js';
import bookingRouter from './routes/booking.routes.js';
import learningGoalRouter from './routes/learningGoal.routes.js';
import savedTutorRouter from './routes/savedTutor.routes.js';
import tutorViewRouter from './routes/tutorView.routes.js';
import reviewRouter from './routes/review.routes.js';
import messageRouter from './routes/message.routes.js';
import paymentRouter from './routes/payment.routes.js';
import tutorProfileRouter from './routes/tutorProfile.routes.js';
import availabilityRouter from './routes/availability.routes.js';
import tutorDashboardRouter from './routes/tutorDashboard.routes.js';
import adminRouter from './routes/admin.routes.js';
import tutorsRouter from './routes/tutors.routes.js';
import webhookRouter from './routes/webhook.routes.js';
import operationsRouter from './routes/operations.routes.js';
import studentExperienceRouter from './routes/studentExperience.routes.js';
import meetingRouter from './routes/meeting.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin || origin === env.CLIENT_URL) return true;
  if (env.NODE_ENV !== 'production') {
    return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  }
  return false;
}

app.use(helmet());
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    callback(isAllowedOrigin(origin) ? null : new Error('Origin is not allowed by CORS'), isAllowedOrigin(origin));
  },
  credentials: true,
}));

// Paystack sends a signed raw JSON body — parse it as a buffer before the JSON body parser.
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRouter);

app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/students', studentRouter);
app.use('/api/student', studentExperienceRouter);
app.use('/api/meetings', meetingRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/users', userRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/learning-goals', learningGoalRouter);
app.use('/api/saved-tutors', savedTutorRouter);
app.use('/api/tutor-views', tutorViewRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/messages', messageRouter);
app.use('/api/payments', paymentRouter);
app.use('/api', operationsRouter);
app.use('/api/tutor-profile', tutorProfileRouter);
app.use('/api/tutor/availability', availabilityRouter);
app.use('/api/tutor/dashboard', tutorDashboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/tutors', tutorsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`MENTORA API listening on http://localhost:${env.PORT}`);
});
