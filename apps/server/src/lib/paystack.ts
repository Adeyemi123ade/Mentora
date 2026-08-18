import { env } from '../env.js';
import { AppError } from './AppError.js';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export function paystackSecretKey(): string {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new AppError(503, 'Payments are not configured on this server yet', 'PAYMENTS_NOT_CONFIGURED');
  }
  return env.PAYSTACK_SECRET_KEY;
}

export async function paystackFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${paystackSecretKey()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await res.json();
  if (!res.ok || body.status === false) {
    throw new AppError(502, body.message ?? 'Payment provider request failed', 'PAYSTACK_ERROR');
  }
  return body.data as T;
}
