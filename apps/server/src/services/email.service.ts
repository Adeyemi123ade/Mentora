import { env } from '../env.js';
import { AppError } from '../lib/AppError.js';

// Uses Brevo's HTTPS transactional-email API instead of raw SMTP. Many hosts
// (Render included) restrict or are unreliable for outbound SMTP (port 587) —
// a blocked/unreachable SMTP connection hangs indefinitely with no error,
// eventually surfacing as a proxy 502 with no indication of the real cause.
// HTTPS on 443 doesn't hit that class of problem, and BREVO_API_KEY was
// already provisioned for this but never actually wired in.
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const REQUEST_TIMEOUT_MS = 15_000;

const hasRealCredentials = Boolean(env.BREVO_API_KEY && !env.BREVO_API_KEY.startsWith('replace-'));

async function sendViaBrevo(
  to: string,
  subject: string,
  text: string,
  html: string,
  failureCode: string,
  failureMessage: string,
): Promise<void> {
  if (!hasRealCredentials) {
    console.error('[email] Brevo API key is not configured; email was not sent.');
    throw new AppError(503, 'Email delivery is not configured. Please contact Mentora support.', 'SMTP_NOT_CONFIGURED');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL ?? env.BREVO_SMTP_LOGIN, name: 'Mentora' },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[email] Brevo API request failed (${res.status}) for ${to}:`, body);
      throw new AppError(502, failureMessage, failureCode);
    }

    console.log(`[email] Sent to ${to} via Brevo API.`);
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error(`[email] Failed to send email to ${to} via Brevo API:`, err);
    throw new AppError(502, failureMessage, failureCode);
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  await sendViaBrevo(
    to,
    'Your Mentora verification code',
    `Your Mentora verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Verify your email</h2>
        <p style="color: #334155;">Use the 6-digit code below to finish creating your Mentora account. It expires in 10 minutes.</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #0f172a; margin: 24px 0;">${code}</p>
        <p style="color: #64748b; font-size: 13px;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
    'OTP_EMAIL_FAILED',
    'Your verification code could not be delivered. Please try resending it.',
  );
}

export async function sendAdminInviteEmail(to: string, inviterName: string, actionLink: string): Promise<void> {
  await sendViaBrevo(
    to,
    `${inviterName} invited you to administer Mentora`,
    `${inviterName} has invited you to become an administrator on Mentora. Set your password to accept: ${actionLink} (this link expires and can only be used once). If you weren't expecting this, you can ignore this email.`,
    `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">You've been invited to Mentora</h2>
        <p style="color: #334155;"><strong>${inviterName}</strong> has invited you to become an administrator on Mentora.</p>
        <p style="margin: 24px 0;"><a href="${actionLink}" style="background: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">Set your password</a></p>
        <p style="color: #64748b; font-size: 13px;">This link expires and can only be used once. If you weren't expecting this invite, you can safely ignore this email.</p>
      </div>
    `,
    'INVITE_EMAIL_FAILED',
    'The invite email could not be delivered. Please try again.',
  );
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  await sendViaBrevo(
    to,
    'Your Mentora password reset code',
    `Your Mentora password reset code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email — your password will not change.`,
    `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Reset your password</h2>
        <p style="color: #334155;">Use the 6-digit code below to reset your Mentora password. It expires in 10 minutes.</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #0f172a; margin: 24px 0;">${code}</p>
        <p style="color: #64748b; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password will not change.</p>
      </div>
    `,
    'RESET_EMAIL_FAILED',
    'Your password reset email could not be delivered. Please try again.',
  );
}
