import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Booking, BookingFormat } from '@mentora/shared';
import { apiRequest } from '../lib/api';
import { InitialsAvatar } from '../components/Avatar';
import { formatBookingDate } from '../lib/scheduling';
import { CalendarIcon, VideoIcon, CheckIcon } from '../components/Icons';

const FORMAT_LABELS: Record<BookingFormat, string> = {
  ONE_ON_ONE: '1-on-1 Live Session',
  GROUP: 'Group Session',
  RECORDED: 'Recorded Session',
};

function isUpcoming(booking: Booking): boolean {
  return new Date(booking.date).getTime() >= new Date().setHours(0, 0, 0, 0) && booking.status === 'CONFIRMED';
}

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    apiRequest<{ bookings: Booking[] }>('/api/bookings')
      .then((res) => setBookings(res.data?.bookings ?? []))
      .catch(() => setBookings([]));
  }, []);

  const upcoming = bookings?.filter(isUpcoming) ?? [];
  const past = bookings?.filter((b) => !isUpcoming(b)) ?? [];

  return (
    <div className="mybookings-page">
      <div className="mystudents-header">
        <div>
          <h1>My Bookings</h1>
          <p>Sessions you've booked with tutors.</p>
        </div>
      </div>

      {bookings === null ? null : bookings.length === 0 ? (
        <div className="mystudents-empty">
          <p>You haven't booked a session yet.</p>
          <Link to="/dashboard/tutors" className="btn btn-primary">Find a Tutor <span aria-hidden="true">→</span></Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mybookings-section">
              <h2>Upcoming</h2>
              <div className="mybookings-list">
                {upcoming.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="mybookings-section">
              <h2>Past &amp; Cancelled</h2>
              <div className="mybookings-list">
                {past.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function statusLabel(booking: Booking): { text: string; tone: string } {
  if (booking.approvalStatus === 'DECLINED') return { text: 'Declined & Refunded', tone: 'cancelled' };
  if (booking.status === 'CANCELLED') return { text: 'Cancelled', tone: 'cancelled' };
  if (booking.status === 'COMPLETED') return { text: 'Completed', tone: 'completed' };
  if (booking.approvalStatus === 'PENDING') return { text: 'Awaiting Tutor Confirmation', tone: 'pending' };
  return { text: 'Confirmed', tone: 'confirmed' };
}

function BookingCard({ booking }: { booking: Booking }) {
  const status = statusLabel(booking);
  return (
    <article className="mybookings-card">
      {booking.tutorPhotoUrl ? (
        <img src={booking.tutorPhotoUrl} alt="" aria-hidden="true" className="mybookings-avatar" />
      ) : (
        <InitialsAvatar name={booking.tutorName} className="mybookings-avatar" />
      )}

      <div className="mybookings-info">
        <div className="mybookings-info-top">
          <strong>{booking.subject}</strong>
          <span className={`mybookings-status ${status.tone}`}>{status.text}</span>
        </div>
        <span className="mybookings-tutor">{booking.tutorName} <CheckIcon className="dash-verified-icon" /> · {FORMAT_LABELS[booking.format]}</span>
        <span className="mybookings-meta"><CalendarIcon /> {formatBookingDate(new Date(booking.date))} · {booking.startTime} – {booking.endTime} (WAT)</span>
        <span className="mybookings-meta">For {booking.studentName}{booking.studentGrade ? ` · ${booking.studentGrade}` : ''}</span>
      </div>

      <div className="mybookings-actions">
        <span className="mybookings-price">₦{booking.total.toLocaleString()}</span>
        <Link to={`/dashboard/tutors/${booking.tutorId}`} className="btn btn-secondary"><VideoIcon /> View Tutor</Link>
      </div>
    </article>
  );
}
