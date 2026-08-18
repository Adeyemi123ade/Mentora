import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MeetingInfo, MeetingProvider, TutorBookingDto, TutorBookingsSummary, TutorCalendarDay } from '@mentora/shared';
import { apiRequest, ApiError } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import {
  CalendarIcon,
  UserFieldIcon,
  BookIcon,
  VideoIcon,
  PinIcon,
  SearchIcon,
  SlidersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  XIcon,
  DotsIcon,
  ClockIcon,
  WalletIcon,
} from '../components/Icons';

const FORMAT_LABELS: Record<string, string> = { ONE_ON_ONE: '1-on-1', GROUP: 'Group', RECORDED: 'Recorded' };
const TABS = ['All', 'Upcoming', 'Pending', 'Completed', 'Cancelled'] as const;
type Tab = (typeof TABS)[number];

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function bookingState(b: TutorBookingDto): { label: string; tone: string; bucket: 'upcoming' | 'pending' | 'completed' | 'cancelled' } {
  if (b.approvalStatus === 'DECLINED' || b.status === 'CANCELLED') return { label: 'Cancelled', tone: 'busy', bucket: 'cancelled' };
  if (b.status === 'COMPLETED') return { label: 'Completed', tone: 'online', bucket: 'completed' };
  if (b.approvalStatus === 'PENDING') return { label: 'Pending', tone: 'pending', bucket: 'pending' };
  return { label: 'Confirmed', tone: 'online', bucket: 'upcoming' };
}

function buildCalendarGrid(month: Date): { date: Date; inMonth: boolean }[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstOfMonth = new Date(year, m, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const date = new Date(year, m, i - startOffset + 1);
    return { date, inMonth: date.getMonth() === m };
  });
}

export function TutorBookingsPage() {
  const [bookings, setBookings] = useState<TutorBookingDto[] | null>(null);
  const [summary, setSummary] = useState<TutorBookingsSummary | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [calendarDays, setCalendarDays] = useState<TutorCalendarDay[]>([]);
  const [tab, setTab] = useState<Tab>('All');
  const [search, setSearch] = useState('');
  const [detailBooking, setDetailBooking] = useState<TutorBookingDto | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadBookings() {
    apiRequest<{ bookings: TutorBookingDto[] }>('/api/tutor/dashboard/bookings')
      .then((r) => setBookings(r.data?.bookings ?? []))
      .catch(() => setBookings([]));
  }

  useEffect(loadBookings, []);
  useEffect(() => {
    apiRequest<{ summary: TutorBookingsSummary }>('/api/tutor/dashboard/bookings-summary').then((r) => setSummary(r.data?.summary ?? null)).catch(() => {});
  }, []);
  useEffect(() => {
    apiRequest<{ days: TutorCalendarDay[] }>(`/api/tutor/dashboard/calendar?year=${calendarMonth.getFullYear()}&month=${calendarMonth.getMonth()}`)
      .then((r) => setCalendarDays(r.data?.days ?? []))
      .catch(() => setCalendarDays([]));
  }, [calendarMonth]);

  const withState = useMemo(() => (bookings ?? []).map((b) => ({ b, state: bookingState(b) })), [bookings]);

  const filtered = useMemo(() => {
    let list = withState;
    if (tab !== 'All') list = list.filter(({ state }) => state.bucket === tab.toLowerCase());
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(({ b }) => b.studentName.toLowerCase().includes(q) || b.parentName.toLowerCase().includes(q) || b.subject.toLowerCase().includes(q));
    }
    return list;
  }, [withState, tab, search]);

  const upcoming = useMemo(() => filtered.filter(({ state }) => state.bucket === 'upcoming'), [filtered]);
  const pending = useMemo(() => filtered.filter(({ state }) => state.bucket === 'pending'), [filtered]);

  async function respond(id: string, action: 'accept' | 'decline' | 'cancel') {
    setError(null);
    setBusyId(id);
    try {
      await apiRequest(`/api/tutor/dashboard/bookings/${id}/${action}`, { method: 'POST' });
      loadBookings();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not ${action} this booking. Please try again.`);
    } finally {
      setBusyId(null);
      setMenuOpenId(null);
    }
  }

  const dayCountMap = new Map(calendarDays.map((d) => [d.date, d.count]));

  return (
    <div className="tdash-home">
      <div className="pay-header">
        <div>
          <h1>Bookings</h1>
          <p className="booking-section-hint">Manage your tutoring sessions and appointments.</p>
        </div>
      </div>

      <div className="tbook-tabs-row">
        <div className="pay-tabs">
          {TABS.map((t) => <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}
        </div>
        <div className="tbook-search-row">
          <div className="pay-search"><SearchIcon /><input type="text" placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <span className="tbook-filter-btn"><SlidersIcon /> Filter</span>
        </div>
      </div>

      {error && <p className="photo-uploader-error">{error}</p>}

      {(tab === 'All' || tab === 'Upcoming') && (
        <section className="dash-card">
          <h2>Upcoming sessions ({upcoming.length})</h2>
          {bookings === null ? null : upcoming.length === 0 ? (
            <div className="mystudents-empty"><p>No upcoming sessions right now.</p></div>
          ) : (
            <div className="tbook-list">
              {upcoming.map(({ b, state }) => (
                <BookingRow
                  key={b.id}
                  b={b}
                  state={state}
                  onViewDetails={() => setDetailBooking(b)}
                  menuOpen={menuOpenId === b.id}
                  onToggleMenu={() => setMenuOpenId((v) => (v === b.id ? null : b.id))}
                  onCancel={() => respond(b.id, 'cancel')}
                  busy={busyId === b.id}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {(tab === 'All' || tab === 'Pending') && (
        <section className="dash-card">
          <h2>Pending requests ({pending.length})</h2>
          {bookings === null ? null : pending.length === 0 ? (
            <div className="mystudents-empty"><p>No pending requests.</p></div>
          ) : (
            <div className="tbook-list">
              {pending.map(({ b }) => (
                <div key={b.id} className="tbook-row">
                  <Avatar name={b.studentName} photoUrl={b.studentPhotoUrl} className="msgs-conv-avatar" />
                  <div className="tbook-row-info">
                    <strong>{b.studentName}</strong>
                    <span className="tbook-row-sub">{b.studentGrade ?? ''}</span>
                    <span className="tbook-row-meta"><BookIcon /> {b.subject}{b.specificTopic ? ` — ${b.specificTopic}` : ''}</span>
                  </div>
                  <div className="tbook-row-meta-col">
                    <span><CalendarIcon /> {formatDate(b.date)}</span>
                    <span>{b.startTime} – {b.endTime}</span>
                  </div>
                  <strong className="tbook-price">₦{b.price.toLocaleString()}</strong>
                  <div className="tbook-request-actions">
                    <button type="button" className="btn btn-secondary" disabled={busyId === b.id} onClick={() => respond(b.id, 'decline')}><XIcon /> Decline</button>
                    <button type="button" className="btn btn-primary" disabled={busyId === b.id} onClick={() => respond(b.id, 'accept')}><CheckIcon /> Accept</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(tab === 'Completed' || tab === 'Cancelled') && (
        <section className="dash-card">
          <h2>{tab} sessions ({filtered.length})</h2>
          {bookings === null ? null : filtered.length === 0 ? (
            <div className="mystudents-empty"><p>Nothing here yet.</p></div>
          ) : (
            <div className="tbook-list">
              {filtered.map(({ b, state }) => (
                <BookingRow
                  key={b.id}
                  b={b}
                  state={state}
                  onViewDetails={() => setDetailBooking(b)}
                  menuOpen={menuOpenId === b.id}
                  onToggleMenu={() => setMenuOpenId((v) => (v === b.id ? null : b.id))}
                  onCancel={() => respond(b.id, 'cancel')}
                  busy={busyId === b.id}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <aside className="tdash-home-sidebar">
        <section className="dash-card">
          <h2>Calendar</h2>
          <div className="tbook-cal-header">
            <button type="button" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeftIcon /></button>
            <strong>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
            <button type="button" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Next month"><ChevronRightIcon /></button>
          </div>
          <div className="tbook-cal-weekdays">{WEEKDAY_HEADERS.map((d) => <span key={d}>{d}</span>)}</div>
          <div className="tbook-cal-grid">
            {buildCalendarGrid(calendarMonth).map(({ date, inMonth }) => {
              const key = date.toISOString().slice(0, 10);
              const isToday = key === new Date().toISOString().slice(0, 10);
              const count = calendarDays.find((d) => d.date === key)?.count ?? 0;
              return (
                <span key={key} className={['tbook-cal-day', !inMonth ? 'outside' : '', isToday ? 'today' : ''].filter(Boolean).join(' ')}>
                  {date.getDate()}
                  {count > 0 && <span className="tbook-cal-dot" />}
                </span>
              );
            })}
          </div>
        </section>

        <section className="dash-card">
          <div className="pay-header" style={{ marginBottom: 4 }}>
            <h2 style={{ margin: 0 }}>Bookings summary</h2>
          </div>
          <div className="tbook-summary-grid">
            <div className="tbook-summary-card">
              <span>Total bookings</span>
              <strong>{summary?.totalBookings ?? '—'}</strong>
              {summary?.totalBookingsChangePercent !== null && summary?.totalBookingsChangePercent !== undefined && (
                <em className={summary.totalBookingsChangePercent >= 0 ? 'up' : 'down'}>{summary.totalBookingsChangePercent >= 0 ? '↑' : '↓'} {Math.abs(summary.totalBookingsChangePercent)}% from last month</em>
              )}
            </div>
            <div className="tbook-summary-card">
              <span>Completed</span>
              <strong>{summary?.completed ?? '—'}</strong>
              {summary?.completedChangePercent !== null && summary?.completedChangePercent !== undefined && (
                <em className={summary.completedChangePercent >= 0 ? 'up' : 'down'}>{summary.completedChangePercent >= 0 ? '↑' : '↓'} {Math.abs(summary.completedChangePercent)}% from last month</em>
              )}
            </div>
            <div className="tbook-summary-card">
              <span>Earnings</span>
              <strong>₦{(summary?.earnings ?? 0).toLocaleString()}</strong>
              {summary?.earningsChangePercent !== null && summary?.earningsChangePercent !== undefined && (
                <em className={summary.earningsChangePercent >= 0 ? 'up' : 'down'}>{summary.earningsChangePercent >= 0 ? '↑' : '↓'} {Math.abs(summary.earningsChangePercent)}% from last month</em>
              )}
            </div>
            <div className="tbook-summary-card">
              <span>Pending</span>
              <strong>{summary?.pending ?? '—'}</strong>
              {summary?.pendingChangePercent !== null && summary?.pendingChangePercent !== undefined && (
                <em className={summary.pendingChangePercent >= 0 ? 'up' : 'down'}>{summary.pendingChangePercent >= 0 ? '↑' : '↓'} {Math.abs(summary.pendingChangePercent)}% from last month</em>
              )}
            </div>
          </div>
        </section>

        <section className="dash-card tdash-quicklinks">
          <h2>Quick actions</h2>
          <Link to="/tutor/availability"><ClockIcon /> Set availability <ChevronRightIcon /></Link>
          <Link to="/tutor/profile"><WalletIcon /> Manage pricing <ChevronRightIcon /></Link>
          <Link to="/tutor/earnings"><WalletIcon /> Payout settings <ChevronRightIcon /></Link>
        </section>
      </aside>

      {detailBooking && <BookingDetailModal booking={detailBooking} onClose={() => setDetailBooking(null)} />}
    </div>
  );
}

function BookingRow({
  b,
  state,
  onViewDetails,
  menuOpen,
  onToggleMenu,
  onCancel,
  busy,
}: {
  b: TutorBookingDto;
  state: { label: string; tone: string; bucket: string };
  onViewDetails: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className="tbook-row">
      <Avatar name={b.studentName} photoUrl={b.studentPhotoUrl} className="msgs-conv-avatar" />
      <div className="tbook-row-info">
        <strong>{b.studentName}</strong>
        <span className="tbook-row-sub">{b.studentGrade ?? ''}</span>
        <span className="tbook-row-meta"><BookIcon /> {b.subject}{b.specificTopic ? ` — ${b.specificTopic}` : ''}</span>
      </div>
      <div className="tbook-row-meta-col">
        <span><CalendarIcon /> {formatDate(b.date)}</span>
        <span>{b.startTime} – {b.endTime}</span>
        <span>{b.format === 'ONE_ON_ONE' || b.format === 'GROUP' ? <><VideoIcon /> Online</> : <><PinIcon /> In-person</>}</span>
      </div>
      <div className="tbook-row-status-col">
        <strong className="tbook-price">₦{b.price.toLocaleString()}</strong>
        <span className={`dash-status-pill ${state.tone}`}>{state.label}</span>
      </div>
      <button type="button" className="btn btn-secondary" onClick={onViewDetails}>View details</button>
      <div className="tbook-menu-wrap">
        <button type="button" className="mystudents-menu-trigger" onClick={onToggleMenu} aria-label="More actions"><DotsIcon /></button>
        {menuOpen && (
          <div className="mystudents-menu tbook-menu" role="menu">
            <button role="menuitem" onClick={onViewDetails}>View details</button>
            {state.bucket === 'upcoming' && (
              <button role="menuitem" className="danger" disabled={busy} onClick={onCancel}>{busy ? 'Cancelling…' : 'Cancel & refund'}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingDetailModal({ booking, onClose }: { booking: TutorBookingDto; onClose: () => void }) {
  const state = bookingState(booking);
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [provider, setProvider] = useState<MeetingProvider>('GOOGLE_MEET');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  function loadMeeting() {
    apiRequest<{ meeting: MeetingInfo }>(`/api/meetings/${booking.id}`)
      .then((response) => setMeeting(response.data?.meeting ?? null))
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Meeting details are unavailable.'));
  }
  useEffect(loadMeeting, [booking.id]);
  async function saveMeeting(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      await apiRequest(`/api/meetings/${booking.id}`, { method: 'PUT', body: JSON.stringify({ provider, meetingUrl }) });
      setMessage('Meeting link saved securely.'); setMeetingUrl(''); loadMeeting();
    } catch (err) { setMessage(err instanceof ApiError ? err.message : 'Could not save the meeting link.'); }
    finally { setSaving(false); }
  }
  return (
    <Modal title="Booking Details" onClose={onClose}>
      <div className="tbook-detail">
        <div className="tbook-detail-row"><span>Student</span><strong>{booking.studentName}{booking.studentGrade ? ` · ${booking.studentGrade}` : ''}</strong></div>
        <div className="tbook-detail-row"><span>Parent</span><strong>{booking.parentName}</strong></div>
        <div className="tbook-detail-row"><span>Subject</span><strong>{booking.subject}{booking.specificTopic ? ` — ${booking.specificTopic}` : ''}</strong></div>
        <div className="tbook-detail-row"><span>Format</span><strong>{FORMAT_LABELS[booking.format]}</strong></div>
        <div className="tbook-detail-row"><span>Date &amp; Time</span><strong>{formatDate(booking.date)}, {booking.startTime}–{booking.endTime}</strong></div>
        <div className="tbook-detail-row"><span>Price</span><strong>₦{booking.price.toLocaleString()}</strong></div>
        <div className="tbook-detail-row"><span>Status</span><strong>{state.label}</strong></div>
      </div>
      {state.bucket === 'upcoming' && <form className="settings-delete-form" onSubmit={saveMeeting}>
        <h3>Meeting access</h3>
        <label className="field"><span>Provider</span><select value={provider} onChange={(event) => setProvider(event.target.value as MeetingProvider)}><option value="GOOGLE_MEET">Google Meet</option><option value="ZOOM">Zoom</option><option value="MICROSOFT_TEAMS">Microsoft Teams</option><option value="OTHER">Other HTTPS provider</option></select></label>
        <label className="field"><span>Secure meeting URL</span><input type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="https://..." required /></label>
        <button type="submit" className="btn btn-primary full" disabled={saving}>{saving ? 'Saving...' : meeting?.availability === 'NOT_CONFIGURED' ? 'Add meeting link' : 'Replace meeting link'}</button>
        {meeting?.joinUrl && <a className="btn btn-secondary full" href={meeting.joinUrl} target="_blank" rel="noopener noreferrer">Start / Join Meeting</a>}
        {message && <p className="booking-section-hint" role="status">{message}</p>}
      </form>}
    </Modal>
  );
}
