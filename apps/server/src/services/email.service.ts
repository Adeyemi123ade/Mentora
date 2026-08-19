import nodemailer from 'nodemailer';
import { env } from '../env.js';
import { AppError } from '../lib/AppError.js';

const hasRealCredentials = Boolean(
  env.BREVO_SMTP_LOGIN &&
    env.BREVO_SMTP_KEY &&
    !env.BREVO_SMTP_LOGIN.startsWith('replace-') &&
    !env.BREVO_SMTP_KEY.startsWith('replace-'),
);

const transporter = hasRealCredentials
  ? nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: env.BREVO_SMTP_LOGIN,
        pass: env.BREVO_SMTP_KEY,
      },
    })
  : null;

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  if (!transporter) {
    console.error('[email] Brevo SMTP is not configured; verification email was not sent.');
    throw new AppError(503, 'Email delivery is not configured. Please contact Mentora support.', 'SMTP_NOT_CONFIGURED');
  }

  try {
    await transporter.sendMail({
      from: `Mentora <${env.BREVO_SENDER_EMAIL ?? env.BREVO_SMTP_LOGIN}>`,
      to,
      subject: 'Your Mentora verification code',
      text: `Your Mentora verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #0f172a;">Verify your email</h2>
          <p style="color: #334155;">Use the 6-digit code below to finish creating your Mentora account. It expires in 10 minutes.</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #0f172a; margin: 24px 0;">${code}</p>
          <p style="color: #64748b; font-size: 13px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    });
    console.log(`[email] Verification email sent to ${to} via Brevo SMTP.`);
  } catch (err) {
    console.error(`[email] Failed to send verification email to ${to} via Brevo SMTP:`, err);
    throw new AppError(502, 'Your verification code could not be delivered. Please try resending it.', 'OTP_EMAIL_FAILED');
  }
}

export async function sendAdminInviteEmail(to: string, inviterName: string, actionLink: string): Promise<void> {
  if (!transporter) {
    console.error('[email] Brevo SMTP is not configured; admin invite email was not sent.');
    throw new AppError(503, 'Email delivery is not configured. Please contact Mentora support.', 'SMTP_NOT_CONFIGURED');
  }

  try {
    await transporter.sendMail({
      from: `Mentora <${env.BREVO_SENDER_EMAIL ?? env.BREVO_SMTP_LOGIN}>`,
      to,
      subject: `${inviterName} invited you to administer Mentora`,
      text: `${inviterName} has invited you to become an administrator on Mentora. Set your password to accept: ${actionLink} (this link expires and can only be used once). If you weren't expecting this, you can ignore this email.`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #0f172a;">You've been invited to Mentora</h2>
          <p style="color: #334155;"><strong>${inviterName}</strong> has invited you to become an administrator on Mentora.</p>
          <p style="margin: 24px 0;"><a href="${actionLink}" style="background: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">Set your password</a></p>
          <p style="color: #64748b; font-size: 13px;">This link expires and can only be used once. If you weren't expecting this invite, you can safely ignore this email.</p>
        </div>
      `,
    });
    console.log(`[email] Admin invite email sent to ${to} via Brevo SMTP.`);
  } catch (err) {
    console.error(`[email] Failed to send admin invite email to ${to} via Brevo SMTP:`, err);
    throw new AppError(502, 'The invite email could not be delivered. Please try again.', 'INVITE_EMAIL_FAILED');
  }
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  if (!transporter) {
    console.error('[email] Brevo SMTP is not configured; password reset email was not sent.');
    throw new AppError(503, 'Email delivery is not configured. Please contact Mentora support.', 'SMTP_NOT_CONFIGURED');
  }

  try {
    await transporter.sendMail({
      from: `Mentora <${env.BREVO_SENDER_EMAIL ?? env.BREVO_SMTP_LOGIN}>`,
      to,
      subject: 'Your Mentora password reset code',
      text: `Your Mentora password reset code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email — your password will not change.`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #0f172a;">Reset your password</h2>
          <p style="color: #334155;">Use the 6-digit code below to reset your Mentora password. It expires in 10 minutes.</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #0f172a; margin: 24px 0;">${code}</p>
          <p style="color: #64748b; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password will not change.</p>
        </div>
      `,
    });
    console.log(`[email] Password reset code sent to ${to} via Brevo SMTP.`);
  } catch (err) {
    console.error(`[email] Failed to send password reset email to ${to} via Brevo SMTP:`, err);
    throw new AppError(502, 'Your password reset email could not be delivered. Please try again.', 'RESET_EMAIL_FAILED');
  }
}
