import { useEffect, useState } from 'react';
import type { TutorDashboardSummary, TutorBookingDto, PayoutDetailsDto } from '@mentora/shared';
import { NIGERIAN_BANKS } from '@mentora/shared';
import { apiRequest, ApiError } from '../lib/api';
import { WalletIcon, CheckIcon, ShieldCheckIcon } from '../components/Icons';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TutorEarningsPage() {
  const [summary, setSummary] = useState<TutorDashboardSummary | null>(null);
  const [bookings, setBookings] = useState<TutorBookingDto[] | null>(null);
  const [payout, setPayout] = useState<PayoutDetailsDto | null>(null);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ summary: TutorDashboardSummary }>('/api/tutor/dashboard/summary').then((r) => setSummary(r.data?.summary ?? null)).catch(() => {});
    apiRequest<{ bookings: TutorBookingDto[] }>('/api/tutor/dashboard/bookings').then((r) => setBookings(r.data?.bookings ?? [])).catch(() => setBookings([]));
    apiRequest<{ payout: PayoutDetailsDto }>('/api/tutor-profile/me/payout').then((r) => setPayout(r.data?.payout ?? null)).catch(() => {});
  }, []);

  const totalEarnings = (bookings ?? []).filter((b) => b.status !== 'CANCELLED').reduce((sum, b) => sum + b.price, 0);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setVerifying(true);
    try {
      const res = await apiRequest<{ payout: PayoutDetailsDto }>('/api/tutor-profile/me/payout/resolve', {
        method: 'POST',
        body: JSON.stringify({ bankCode, accountNumber }),
      });
      setPayout(res.data?.payout ?? null);
      setSuccess('Payout account verified and saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify this account. Double-check the details and try again.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="tdash-home">
      <div className="pay-header">
        <div>
          <h1>Earnings</h1>
          <p className="booking-section-hint">Track what you've earned and set up how you get paid.</p>
        </div>
      </div>

      <div className="mystudents-stats-grid">
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-purple"><WalletIcon /></span>
          <div><strong>₦{totalEarnings.toLocaleString()}</strong><span>Total earnings (All time)</span></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-green"><WalletIcon /></span>
          <div><strong>₦{(summary?.totalEarningsThisMonth ?? 0).toLocaleString()}</strong><span>This month</span></div>
        </div>
      </div>

      <section className="dash-card">
        <h2>Payout details</h2>
        <p className="booking-section-hint">
          We verify your bank account in real time via Paystack before saving it. Automatic payouts aren't live yet — this is
          coming soon; for now this just confirms where your earnings will eventually be sent.
        </p>

        {payout?.verifiedAt && (
          <div className="tavail-day-empty" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green, #16a34a)', marginBottom: 12 }}>
            <CheckIcon /> Verified: {payout.accountName} · {payout.bankName} · ****{payout.accountNumber?.slice(-4)}
          </div>
        )}

        <form className="tearn-payout-form" onSubmit={handleVerify}>
          <div className="tutor-onb-grid-2" style={{ marginTop: 0 }}>
            <div className="tutor-onb-field">
              <label className="tutor-onb-label">Bank</label>
              <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} required>
                <option value="">Select your bank</option>
                {NIGERIAN_BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>
            <div className="tutor-onb-field">
              <label className="tutor-onb-label">Account number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="0123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          </div>
          {error && <p className="photo-uploader-error">{error}</p>}
          {success && <p style={{ color: 'var(--green, #16a34a)', fontSize: '0.85rem', marginTop: 8 }}><ShieldCheckIcon /> {success}</p>}
          <button type="submit" className="btn btn-primary" disabled={verifying || bankCode === '' || accountNumber.length !== 10} style={{ marginTop: 16 }}>
            {verifying ? 'Verifying with Paystack…' : 'Verify & Save Account'}
          </button>
        </form>
      </section>

      <section className="dash-card">
        <h2>Earnings history</h2>
        {bookings === null ? null : bookings.filter((b) => b.status !== 'CANCELLED').length === 0 ? (
          <div className="mystudents-empty"><p>No earnings yet.</p></div>
        ) : (
          <div className="pay-tx-list">
            {bookings.filter((b) => b.status !== 'CANCELLED').map((b) => (
              <div key={b.id} className="pay-tx-row">
                <span className="pay-tx-icon"><WalletIcon /></span>
                <div className="pay-tx-info">
                  <strong>{b.subject} with {b.studentName}</strong>
                  <span>{formatDate(b.date)}</span>
                </div>
                <strong className="pay-tx-amount">₦{b.price.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
