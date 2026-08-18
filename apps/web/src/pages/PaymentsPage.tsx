import { useEffect, useMemo, useState } from 'react';
import type { PaymentsSummary, TransactionDto, PaymentMethodDto, WalletDto, InitializePaymentResponse } from '@mentora/shared';
import { apiRequest, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { openPaystackCheckout } from '../lib/paystack';
import { Modal } from '../components/Modal';
import { ComingSoonModal } from '../components/ComingSoonModal';
import {
  WalletIcon,
  CardIcon,
  CalendarIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  SearchIcon,
  ShieldCheckIcon,
  HelpCircleIcon,
} from '../components/Icons';

type Tab = 'transactions' | 'invoices' | 'wallet' | 'methods';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function PaymentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('transactions');
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionDto[] | null>(null);
  const [methods, setMethods] = useState<PaymentMethodDto[] | null>(null);
  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [search, setSearch] = useState('');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [receiptTx, setReceiptTx] = useState<TransactionDto | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [contactSupportOpen, setContactSupportOpen] = useState(false);

  function loadAll() {
    apiRequest<{ summary: PaymentsSummary }>('/api/payments/summary').then((r) => setSummary(r.data?.summary ?? null)).catch(() => {});
    apiRequest<{ transactions: TransactionDto[] }>('/api/payments/transactions').then((r) => setTransactions(r.data?.transactions ?? [])).catch(() => setTransactions([]));
    apiRequest<{ methods: PaymentMethodDto[] }>('/api/payments/methods').then((r) => setMethods(r.data?.methods ?? [])).catch(() => setMethods([]));
    apiRequest<{ wallet: WalletDto }>('/api/payments/wallet').then((r) => setWallet(r.data?.wallet ?? null)).catch(() => {});
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!search.trim()) return transactions;
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => t.description.toLowerCase().includes(q) || (t.tutorName ?? '').toLowerCase().includes(q));
  }, [transactions, search]);

  const walletTransactions = useMemo(
    () => (transactions ?? []).filter((t) => t.type === 'WALLET_TOPUP' || t.type === 'CARD_VERIFICATION'),
    [transactions]
  );

  const upcomingPayments = useMemo(
    () => (transactions ?? []).filter((t) => t.bookingId && t.sessionDate && new Date(t.sessionDate) > new Date()).slice(0, 4),
    [transactions]
  );

  const spendingBySubject = useMemo(() => {
    const bookingTx = (transactions ?? []).filter((t) => t.type === 'BOOKING_PAYMENT');
    const total = bookingTx.reduce((sum, t) => sum + t.amount, 0);
    if (total === 0) return [];
    const groups = new Map<string, number>();
    for (const t of bookingTx) {
      const key = t.subject ?? 'Other';
      groups.set(key, (groups.get(key) ?? 0) + t.amount);
    }
    return Array.from(groups.entries())
      .map(([subject, amount]) => ({ subject, amount, percent: Math.round((amount / total) * 100) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  async function handleTopUpConfirm(amount: number) {
    if (!user?.email) return;
    try {
      const init = await apiRequest<InitializePaymentResponse>('/api/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({ amount, purpose: 'WALLET_TOPUP' }),
      });
      if (!init.data) throw new Error('Could not start payment.');
      const result = await openPaystackCheckout({ email: user.email, amountNaira: amount, reference: init.data.reference });
      if (!result) return;
      const confirm = await apiRequest<{ wallet: WalletDto }>('/api/payments/wallet/confirm', {
        method: 'POST',
        body: JSON.stringify({ reference: result.reference }),
      });
      setWallet(confirm.data?.wallet ?? null);
      setBanner({ tone: 'success', text: `Wallet topped up by ₦${amount.toLocaleString()}.` });
      setTopUpOpen(false);
      loadAll();
    } catch (err) {
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Wallet top up failed. Please try again.' });
    }
  }

  async function handleAddMethod() {
    if (!user?.email) return;
    try {
      const init = await apiRequest<InitializePaymentResponse>('/api/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({ amount: 50, purpose: 'CARD_VERIFICATION' }),
      });
      if (!init.data) throw new Error('Could not start card verification.');
      const result = await openPaystackCheckout({ email: user.email, amountNaira: init.data.amount, reference: init.data.reference });
      if (!result) return;
      const confirm = await apiRequest<{ methods: PaymentMethodDto[] }>('/api/payments/methods/confirm', {
        method: 'POST',
        body: JSON.stringify({ reference: result.reference }),
      });
      setMethods(confirm.data?.methods ?? []);
      setBanner({ tone: 'success', text: 'Card saved. The ₦50 verification charge was added to your wallet.' });
      setAddMethodOpen(false);
      loadAll();
    } catch (err) {
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not save this card. Please try again.' });
    }
  }

  async function handleDeleteMethod(id: string) {
    const previous = methods;
    setMethods((prev) => prev?.filter((m) => m.id !== id) ?? prev);
    try {
      await apiRequest(`/api/payments/methods/${id}`, { method: 'DELETE' });
    } catch {
      setMethods(previous ?? null);
      setBanner({ tone: 'error', text: 'Could not remove this payment method.' });
    }
  }

  return (
    <div className="pay-page">
      <div className="pay-header">
        <div>
          <h1>Payments</h1>
          <p className="booking-section-hint">Track your transactions, invoices and payment methods.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setAddMethodOpen(true)}>
          <PlusIcon /> Add Payment Method
        </button>
      </div>

      {banner && <div className={banner.tone === 'success' ? 'pay-banner success' : 'pay-banner error'}>{banner.text}</div>}

      <div className="mystudents-stats-grid">
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-blue"><CardIcon /></span>
          <div><strong>₦{(summary?.totalSpent ?? 0).toLocaleString()}</strong><span>Total Spent (All time)</span></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-green"><CheckIcon /></span>
          <div><strong>₦{(summary?.paidThisMonth ?? 0).toLocaleString()}</strong><span>Paid This Month</span></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-purple"><CalendarIcon /></span>
          <div><strong>₦{(summary?.scheduledUpcoming ?? 0).toLocaleString()}</strong><span>Scheduled (Upcoming)</span></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-orange"><WalletIcon /></span>
          <div>
            <strong>₦{(summary?.walletBalance ?? 0).toLocaleString()}</strong>
            <span>Wallet Balance</span>
            <button type="button" className="pay-topup-link" onClick={() => setTopUpOpen(true)}>Top up wallet →</button>
          </div>
        </div>
      </div>

      <div className="pay-layout">
        <div className="pay-main">
          <div className="pay-tabs">
            <button type="button" className={tab === 'transactions' ? 'active' : ''} onClick={() => setTab('transactions')}>Transactions</button>
            <button type="button" className={tab === 'invoices' ? 'active' : ''} onClick={() => setTab('invoices')}>Invoices</button>
            <button type="button" className={tab === 'wallet' ? 'active' : ''} onClick={() => setTab('wallet')}>Wallet</button>
            <button type="button" className={tab === 'methods' ? 'active' : ''} onClick={() => setTab('methods')}>Payment Methods</button>
            {(tab === 'transactions' || tab === 'invoices') && (
              <div className="pay-search">
                <SearchIcon />
                <input type="text" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            )}
          </div>

          {tab === 'transactions' && (
            <section className="dash-card">
              <h2>Recent Transactions</h2>
              {transactions === null ? null : filteredTransactions.length === 0 ? (
                <div className="mystudents-empty"><p>No transactions yet. Book a session to see it here.</p></div>
              ) : (
                <div className="pay-tx-list">
                  {filteredTransactions.map((t) => (
                    <div key={t.id} className="pay-tx-row">
                      <span className="pay-tx-icon"><CardIcon /></span>
                      <div className="pay-tx-info">
                        <strong>{t.description}</strong>
                        <span>{t.subject ? `${t.subject} · ` : ''}{formatDate(t.createdAt)}</span>
                      </div>
                      <span className="dash-status-pill online">Paid</span>
                      <strong className="pay-tx-amount">₦{t.amount.toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'invoices' && (
            <section className="dash-card">
              <h2>Your Invoices</h2>
              {transactions === null ? null : filteredTransactions.length === 0 ? (
                <div className="mystudents-empty"><p>No invoices yet.</p></div>
              ) : (
                <div className="pay-invoice-table">
                  <div className="pay-invoice-head">
                    <span>Invoice</span><span>Date</span><span>Description</span><span>Amount</span><span>Status</span><span />
                  </div>
                  {filteredTransactions.map((t) => (
                    <div key={t.id} className="pay-invoice-row">
                      <span>{t.invoiceNumber}</span>
                      <span>{formatDate(t.createdAt)}</span>
                      <span>{t.description}</span>
                      <span>₦{t.amount.toLocaleString()}</span>
                      <span className="dash-status-pill online">Paid</span>
                      <button type="button" className="btn btn-secondary" onClick={() => setReceiptTx(t)}>View Receipt</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'wallet' && (
            <section className="dash-card">
              <div className="pay-wallet-hero">
                <div>
                  <span>Wallet Balance</span>
                  <strong>₦{(wallet?.balance ?? 0).toLocaleString()}</strong>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => setTopUpOpen(true)}><PlusIcon /> Top Up Wallet</button>
              </div>
              <h2>Wallet Activity</h2>
              {walletTransactions.length === 0 ? (
                <div className="mystudents-empty"><p>No wallet activity yet.</p></div>
              ) : (
                <div className="pay-tx-list">
                  {walletTransactions.map((t) => (
                    <div key={t.id} className="pay-tx-row">
                      <span className="pay-tx-icon"><WalletIcon /></span>
                      <div className="pay-tx-info">
                        <strong>{t.description}</strong>
                        <span>{formatDate(t.createdAt)}</span>
                      </div>
                      <strong className="pay-tx-amount">+₦{t.amount.toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'methods' && (
            <section className="dash-card">
              <h2>Saved Payment Methods</h2>
              {methods === null ? null : methods.length === 0 ? (
                <div className="mystudents-empty">
                  <p>No saved cards yet. Add one with a small ₦50 verification charge (credited straight to your wallet).</p>
                  <button type="button" className="btn btn-primary" onClick={() => setAddMethodOpen(true)}><PlusIcon /> Add Payment Method</button>
                </div>
              ) : (
                <div className="pay-methods-list">
                  {methods.map((m) => (
                    <div key={m.id} className="pay-method-row">
                      <span className="pay-tx-icon"><CardIcon /></span>
                      <div className="pay-tx-info">
                        <strong>{m.cardType.toUpperCase()} •••• {m.last4}</strong>
                        <span>Expires {m.expMonth}/{m.expYear}{m.bank ? ` · ${m.bank}` : ''}</span>
                      </div>
                      <button type="button" className="pay-method-remove" aria-label="Remove card" onClick={() => handleDeleteMethod(m.id)}><TrashIcon /></button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="pay-sidebar">
          <section className="dash-card">
            <h2>Spending Summary</h2>
            {spendingBySubject.length === 0 ? (
              <p className="booking-section-hint">Your spend by subject will show up here once you've paid for a session.</p>
            ) : (
              <div className="pay-spend-list">
                {spendingBySubject.map((s) => (
                  <div key={s.subject} className="pay-spend-row">
                    <span>{s.subject}</span>
                    <div className="pay-spend-bar"><span style={{ width: `${s.percent}%` }} /></div>
                    <span className="pay-spend-pct">₦{s.amount.toLocaleString()} ({s.percent}%)</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dash-card">
            <h2>Upcoming Payments</h2>
            {upcomingPayments.length === 0 ? (
              <p className="booking-section-hint">No upcoming paid sessions.</p>
            ) : (
              <div className="pay-upcoming-list">
                {upcomingPayments.map((t) => (
                  <div key={t.id} className="pay-upcoming-row">
                    <div>
                      <strong>{t.tutorName}</strong>
                      <span>{t.subject} · {t.sessionDate ? formatDate(t.sessionDate) : ''}</span>
                    </div>
                    <strong>₦{t.amount.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dash-card pay-help-card">
            <span className="pay-help-icon"><HelpCircleIcon /></span>
            <strong>Need Help?</strong>
            <p className="booking-section-hint">Questions about payments, invoices or your wallet? Our support team is here to help.</p>
            <button type="button" className="btn btn-secondary full" onClick={() => setContactSupportOpen(true)}>Contact Support</button>
          </section>
        </aside>
      </div>

      {topUpOpen && <TopUpModal onClose={() => setTopUpOpen(false)} onConfirm={handleTopUpConfirm} />}
      {addMethodOpen && <AddMethodModal onClose={() => setAddMethodOpen(false)} onConfirm={handleAddMethod} />}
      {receiptTx && <ReceiptModal tx={receiptTx} onClose={() => setReceiptTx(null)} />}
      {contactSupportOpen && <ComingSoonModal title="Contact Support" onClose={() => setContactSupportOpen(false)} />}
    </div>
  );
}

function TopUpModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (amount: number) => Promise<void> }) {
  const [amount, setAmount] = useState('5000');
  const [submitting, setSubmitting] = useState(false);
  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed >= 100;

  return (
    <Modal title="Top Up Wallet" onClose={onClose}>
      <p className="booking-section-hint">Add funds to your Mentora wallet to pay for sessions instantly, without a card each time.</p>
      <label className="field-label-standalone">Amount (₦)</label>
      <input type="number" min={100} step={100} className="settings-inline-input" style={{ width: '100%' }} value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button
        type="button"
        className="btn btn-primary full"
        disabled={!valid || submitting}
        style={{ marginTop: 16 }}
        onClick={async () => {
          setSubmitting(true);
          await onConfirm(parsed);
          setSubmitting(false);
        }}
      >
        {submitting ? 'Opening secure checkout…' : `Pay ₦${valid ? parsed.toLocaleString() : '0'} with Paystack`}
      </button>
    </Modal>
  );
}

function AddMethodModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <Modal title="Add Payment Method" onClose={onClose} size="lg">
      <p className="booking-section-hint">
        We verify a new card with a real ₦50 charge through Paystack. That ₦50 is not lost — it's credited straight to your Mentora
        wallet balance, and your card is saved for faster checkout next time.
      </p>
      <button
        type="button"
        className="btn btn-primary full"
        disabled={submitting}
        onClick={async () => {
          setSubmitting(true);
          await onConfirm();
          setSubmitting(false);
        }}
      >
        {submitting ? 'Opening secure checkout…' : 'Verify Card (₦50)'}
      </button>
    </Modal>
  );
}

function ReceiptModal({ tx, onClose }: { tx: TransactionDto; onClose: () => void }) {
  return (
    <Modal title="Receipt" onClose={onClose}>
      <div className="pay-receipt">
        <div className="pay-receipt-row"><span>Invoice</span><strong>{tx.invoiceNumber}</strong></div>
        <div className="pay-receipt-row"><span>Description</span><strong>{tx.description}</strong></div>
        {tx.subject && <div className="pay-receipt-row"><span>Subject</span><strong>{tx.subject}</strong></div>}
        {tx.sessionDate && <div className="pay-receipt-row"><span>Session Date</span><strong>{formatDate(tx.sessionDate)}</strong></div>}
        <div className="pay-receipt-row"><span>Paid On</span><strong>{formatDateTime(tx.createdAt)}</strong></div>
        <div className="pay-receipt-row"><span>Payment Method</span><strong>{tx.source === 'WALLET' ? 'Wallet' : 'Card'}</strong></div>
        <div className="pay-receipt-row pay-receipt-total"><span>Amount Paid</span><strong>₦{tx.amount.toLocaleString()}</strong></div>
      </div>
      {tx.source === 'CARD' && (
        <div className="pay-receipt-verified"><ShieldCheckIcon /> Verified by Paystack</div>
      )}
      <button type="button" className="btn btn-secondary full" style={{ marginTop: 16 }} onClick={() => window.print()}>Print Receipt</button>
    </Modal>
  );
}
