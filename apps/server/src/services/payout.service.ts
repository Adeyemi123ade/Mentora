import type { PayoutDetailsDto } from '@mentora/shared';
import { NIGERIAN_BANKS } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import { paystackFetch } from '../lib/paystack.js';

type ResolveAccountData = {
  account_number: string;
  account_name: string;
  bank_id: number;
};

function toDto(profile: { payoutBankCode: string | null; payoutBankName: string | null; payoutAccountNumber: string | null; payoutAccountName: string | null; payoutVerifiedAt: Date | null }): PayoutDetailsDto {
  return {
    bankCode: profile.payoutBankCode,
    bankName: profile.payoutBankName,
    accountNumber: profile.payoutAccountNumber,
    accountName: profile.payoutAccountName,
    verifiedAt: profile.payoutVerifiedAt ? profile.payoutVerifiedAt.toISOString() : null,
  };
}

export async function getPayoutDetails(tutorId: string): Promise<PayoutDetailsDto> {
  const profile = await prisma.tutorProfile.upsert({ where: { userId: tutorId }, update: {}, create: { userId: tutorId } });
  return toDto(profile);
}

export async function resolveAndSaveAccount(tutorId: string, bankCode: string, accountNumber: string): Promise<PayoutDetailsDto> {
  const bank = NIGERIAN_BANKS.find((b) => b.code === bankCode);
  if (!bank) throw new AppError(400, 'Unknown bank', 'UNKNOWN_BANK');

  const resolved = await paystackFetch<ResolveAccountData>(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    { method: 'GET' }
  );

  const profile = await prisma.tutorProfile.upsert({
    where: { userId: tutorId },
    update: {
      payoutBankCode: bankCode,
      payoutBankName: bank.name,
      payoutAccountNumber: accountNumber,
      payoutAccountName: resolved.account_name,
      payoutVerifiedAt: new Date(),
    },
    create: {
      userId: tutorId,
      payoutBankCode: bankCode,
      payoutBankName: bank.name,
      payoutAccountNumber: accountNumber,
      payoutAccountName: resolved.account_name,
      payoutVerifiedAt: new Date(),
    },
  });

  return toDto(profile);
}
