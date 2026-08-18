import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Review, ReviewableBooking, ReviewTag } from '@mentora/shared';
import { REVIEW_TAGS } from '@mentora/shared';
import { apiRequest, ApiError } from '../lib/api';
import { InitialsAvatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import {
  StarIcon,
  ChatIcon,
  UsersIcon,
  ShieldCheckIcon,
  EditIcon,
  CalendarIcon,
  CheckIcon,
  DotsIcon,
  TrashIcon,
  XIcon,
  TrophyIcon,
  SearchIcon,
} from '../components/Icons';

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months <= 1) return '1 month ago';
  return `${months} months ago`;
}

function formatSessionDate(iso: string, time: string): string {
  const date = new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${date} · ${time}`;
}

function Stars({ rating, size = 'md' }: { rating: number; size?: 'md' | 'lg' }) {
  return (
    <span className={size === 'lg' ? 'tprofile-stars reviews-stars-lg' : 'tprofile-stars'} aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(rating)}
      {'☆'.repeat(Math.max(0, 5 - rating))}
    </span>
  );
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [reviewableBookings, setReviewableBookings] = useState<ReviewableBooking[] | null>(null);
  const [tab, setTab] = useState<'all' | 'you' | 'tutors' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [presetBookingId, setPresetBookingId] = useState<string | null>(null);
  const [howWeCollectOpen, setHowWeCollectOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  function loadReviews() {
    apiRequest<{ reviews: Review[] }>('/api/reviews').then((r) => setReviews(r.data?.reviews ?? [])).catch(() => setReviews([]));
  }
  function loadReviewable() {
    apiRequest<{ bookings: ReviewableBooking[] }>('/api/reviews/reviewable-bookings')
      .then((r) => setReviewableBookings(r.data?.bookings ?? []))
      .catch(() => setReviewableBookings([]));
  }

  useEffect(() => {
    loadReviews();
    loadReviewable();
  }, []);

  const stats = useMemo(() => {
    const list = reviews ?? [];
    const avg = list.length > 0 ? Math.round((list.reduce((sum, r) => sum + r.rating, 0) / list.length) * 10) / 10 : null;
    const tutorsReviewed = new Set(list.map((r) => r.tutorId)).size;
    return { avg, total: list.length, tutorsReviewed };
  }, [reviews]);

  const ratingBreakdown = useMemo(() => {
    const list = reviews ?? [];
    return [5, 4, 3, 2, 1].map((stars) => {
      const count = list.filter((r) => r.rating === stars).length;
      const percent = list.length > 0 ? Math.round((count / list.length) * 100) : 0;
      return { stars, count, percent };
    });
  }, [reviews]);

  const whatParentsLove = useMemo(() => {
    const list = reviews ?? [];
    if (list.length === 0) return [];
    const counts = new Map<string, number>();
    list.forEach((r) => r.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, percent: Math.round((count / list.length) * 100) }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 4);
  }, [reviews]);

  const recentReviews = (reviews ?? []).slice(0, 3);

  const groupedByTutor = useMemo(() => {
    const groups = new Map<string, { tutorName: string; reviews: Review[] }>();
    (reviews ?? []).forEach((r) => {
      const g = groups.get(r.tutorId) ?? { tutorName: r.tutorName, reviews: [] };
      g.reviews.push(r);
      groups.set(r.tutorId, g);
    });
    return Array.from(groups.values());
  }, [reviews]);

  const term = searchTerm.trim().toLowerCase();
  const matchesSearch = (r: Review) => !term || `${r.tutorName} ${r.title} ${r.body} ${r.tags.join(' ')}`.toLowerCase().includes(term);

  function openWriteModal(bookingId: string | null) {
    setPresetBookingId(bookingId);
    setWriteModalOpen(true);
  }

  async function handleDelete(reviewId: string) {
    if (!window.confirm('Delete this review?')) return;
    setReviews((prev) => prev?.filter((r) => r.id !== reviewId) ?? prev);
    try {
      await apiRequest(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      loadReviewable();
    } catch {
      loadReviews();
    }
  }

  return (
    <div className="reviews-page">
      <div className="mystudents-header">
        <div>
          <h1>Reviews</h1>
          <p>Share your experience and help other parents find the right tutors.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => openWriteModal(null)}>
          <EditIcon /> Write a Review
        </button>
      </div>

      <div className="mystudents-stats-grid">
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-purple"><StarIcon /></span>
          <div><strong>{stats.avg ?? '—'}</strong><span>Average Rating</span><em>Across {stats.total} reviews</em></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-green"><ChatIcon /></span>
          <div><strong>{stats.total}</strong><span>Total Reviews</span><em>All time</em></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-orange"><UsersIcon /></span>
          <div><strong>{stats.tutorsReviewed}</strong><span>Tutors Reviewed</span><em>You've reviewed</em></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-blue"><ShieldCheckIcon /></span>
          <div><strong>{stats.total > 0 ? '100%' : '—'}</strong><span>Verified Reviews</span><em>From booked sessions</em></div>
        </div>
      </div>

      {reviews === null ? null : reviews.length === 0 && (reviewableBookings ?? []).length === 0 ? (
        <div className="mystudents-empty">
          <p>You haven't written any reviews yet. Reviews unlock once a booked session has passed.</p>
          <Link to="/dashboard/tutors" className="btn btn-primary">Find a Tutor <span aria-hidden="true">→</span></Link>
        </div>
      ) : (
        <div className="reviews-layout">
          <div className="reviews-main">
            <div className="savedtutors-toolbar">
              <nav className="savedtutors-tabs">
                <button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All Reviews</button>
                <button type="button" className={tab === 'you' ? 'active' : ''} onClick={() => setTab('you')}>By You</button>
                <button type="button" className={tab === 'tutors' ? 'active' : ''} onClick={() => setTab('tutors')}>By Tutors</button>
                <button type="button" className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>Pending ({reviewableBookings?.length ?? 0})</button>
              </nav>

              <label className="disc-search-input savedtutors-search">
                <SearchIcon />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search reviews..." />
              </label>
            </div>

            {tab === 'pending' ? (
              (reviewableBookings ?? []).length === 0 ? (
                <div className="mystudents-empty"><p>Nothing to review right now — you're all caught up.</p></div>
              ) : (
                <div className="reviews-list">
                  {(reviewableBookings ?? []).map((b) => (
                    <article key={b.id} className="dash-card reviews-pending-card">
                      {b.tutorPhotoUrl ? (
                        <img src={b.tutorPhotoUrl} alt="" aria-hidden="true" className="reviews-avatar" />
                      ) : (
                        <InitialsAvatar name={b.tutorName} className="reviews-avatar" />
                      )}
                      <div className="reviews-pending-info">
                        <strong>{b.tutorName}</strong>
                        <span>{b.subject} · Session with {b.studentName}</span>
                        <span className="mybookings-meta"><CalendarIcon /> {formatSessionDate(b.date, b.startTime)}</span>
                      </div>
                      <button type="button" className="btn btn-primary" onClick={() => openWriteModal(b.id)}>
                        <EditIcon /> Write a Review
                      </button>
                    </article>
                  ))}
                </div>
              )
            ) : tab === 'tutors' ? (
              groupedByTutor.length === 0 ? (
                <div className="mystudents-empty"><p>No reviews yet.</p></div>
              ) : (
                <div className="reviews-grouped">
                  {groupedByTutor.map((group) => (
                    <div key={group.tutorName} className="reviews-group">
                      <h3>{group.tutorName}</h3>
                      <div className="reviews-list">
                        {group.reviews.filter(matchesSearch).map((r) => (
                          <ReviewCard key={r.id} review={r} onDelete={() => handleDelete(r.id)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              (() => {
                const list = (reviews ?? []).filter(matchesSearch);
                return list.length === 0 ? (
                  <div className="mystudents-empty"><p>No reviews match your search.</p></div>
                ) : (
                  <div className="reviews-list">
                    {list.map((r) => <ReviewCard key={r.id} review={r} onDelete={() => handleDelete(r.id)} />)}
                  </div>
                );
              })()
            )}
          </div>

          <aside className="reviews-sidebar">
            <div className="dash-card">
              <h2>Review Summary</h2>
              <strong className="reviews-summary-number">{stats.avg ?? '—'}</strong>
              {stats.avg !== null && <Stars rating={Math.round(stats.avg)} size="lg" />}
              <span className="reviews-summary-based">Based on {stats.total} reviews</span>

              <div className="booking-price-breakdown reviews-breakdown">
                {ratingBreakdown.map((row) => (
                  <div key={row.stars} className="tprofile-rating-bar-row reviews-bar-row">
                    <span>{row.stars} Stars</span>
                    <div className="tprofile-rating-bar"><span style={{ width: `${row.percent}%` }} /></div>
                    <span>{row.percent}%</span>
                  </div>
                ))}
              </div>

              {whatParentsLove.length > 0 && (
                <>
                  <span className="mystudents-col-heading">What parents love</span>
                  <div className="reviews-love-list">
                    {whatParentsLove.map((item) => (
                      <div key={item.tag} className="reviews-love-row">
                        <span><CheckIcon /> {item.tag}</span>
                        <span>{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <button type="button" className="mystudents-view-link reviews-how-link" onClick={() => setHowWeCollectOpen(true)}>
                See how we collect reviews <span aria-hidden="true">→</span>
              </button>
            </div>

            {recentReviews.length > 0 && (
              <div className="dash-card">
                <h2>Recent Reviews</h2>
                <div className="reviews-recent-list">
                  {recentReviews.map((r) => (
                    <div key={r.id} className="reviews-recent-row">
                      {r.tutorPhotoUrl ? (
                        <img src={r.tutorPhotoUrl} alt="" aria-hidden="true" className="reviews-recent-avatar" />
                      ) : (
                        <InitialsAvatar name={r.tutorName} className="reviews-recent-avatar" />
                      )}
                      <div>
                        <strong>{r.tutorName}</strong>
                        <Stars rating={r.rating} />
                        <span>{r.title}</span>
                        <span className="mybookings-meta">Session with {r.studentName}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="mystudents-view-link" onClick={() => setTab('all')}>View all reviews <span aria-hidden="true">→</span></button>
              </div>
            )}
          </aside>
        </div>
      )}

      {!bannerDismissed && (reviews ?? []).length > 0 && (
        <div className="dash-sticky-banner">
          <span className="dash-sticky-icon"><TrophyIcon /></span>
          <div className="dash-sticky-copy">
            <strong>Your reviews make a difference!</strong>
            <span>Your feedback helps other parents make confident decisions and helps tutors improve.</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => openWriteModal(null)}>
            <EditIcon /> Write a Review
          </button>
          <button type="button" className="dash-sticky-close" aria-label="Dismiss" onClick={() => setBannerDismissed(true)}><XIcon /></button>
        </div>
      )}

      {writeModalOpen && (
        <WriteReviewModal
          presetBookingId={presetBookingId}
          reviewableBookings={reviewableBookings ?? []}
          onClose={() => setWriteModalOpen(false)}
          onSaved={() => {
            setWriteModalOpen(false);
            loadReviews();
            loadReviewable();
          }}
        />
      )}

      {howWeCollectOpen && (
        <Modal title="How we collect reviews" onClose={() => setHowWeCollectOpen(false)}>
          <p className="booking-section-hint">
            Every review on Mentora comes from a real booked session — you can only review a tutor after a session on your
            calendar has taken place, and each session can only be reviewed once. That's what keeps the "Verified Reviews"
            badge honest: there's no path to post a review without a matching completed booking behind it.
          </p>
        </Modal>
      )}
    </div>
  );
}

function ReviewCard({ review, onDelete }: { review: Review; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <article className="dash-card reviews-card">
      {review.tutorPhotoUrl ? (
        <img src={review.tutorPhotoUrl} alt="" aria-hidden="true" className="reviews-avatar" />
      ) : (
        <InitialsAvatar name={review.tutorName} className="reviews-avatar" />
      )}

      <div className="reviews-card-body">
        <div className="reviews-card-head">
          <div>
            <strong>{review.tutorName} <CheckIcon className="dash-verified-icon" /></strong>
            <span className="disc-tutor-title">{review.tutorTitle}</span>
          </div>
          <div className="reviews-card-head-right">
            <Stars rating={review.rating} />
            <span className="mybookings-meta">{formatRelative(review.createdAt)}</span>
          </div>
        </div>

        <h4 className="reviews-title">{review.title}</h4>
        <span className="mybookings-meta"><CalendarIcon /> Session with {review.studentName} · {formatSessionDate(review.sessionDate, review.sessionStartTime)}</span>
        <p className="reviews-body-text">{review.body}</p>

        {review.tags.length > 0 && (
          <div className="disc-tutor-tags">
            {review.tags.map((t) => <span key={t} className="disc-tag">{t}</span>)}
          </div>
        )}

        <Link to={`/dashboard/tutors/${review.tutorId}`} className="btn btn-secondary reviews-view-btn">View Tutor Profile</Link>
      </div>

      <button type="button" className="mystudents-menu-trigger" onClick={() => setMenuOpen((v) => !v)} aria-label="Review actions">
        <DotsIcon />
      </button>
      {menuOpen && (
        <div className="mystudents-menu reviews-menu" role="menu">
          <Link role="menuitem" to={`/dashboard/tutors/${review.tutorId}`}><UsersIcon /> View Tutor Profile</Link>
          <button type="button" role="menuitem" className="danger" onClick={onDelete}><TrashIcon /> Delete Review</button>
        </div>
      )}
    </article>
  );
}

function WriteReviewModal({
  presetBookingId,
  reviewableBookings,
  onClose,
  onSaved,
}: {
  presetBookingId: string | null;
  reviewableBookings: ReviewableBooking[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bookingId, setBookingId] = useState(presetBookingId ?? reviewableBookings[0]?.id ?? '');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: ReviewTag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!bookingId) {
      setError('Select a session to review.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ bookingId, rating, title, body, tags }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (reviewableBookings.length === 0) {
    return (
      <Modal title="Write a Review" onClose={onClose}>
        <p className="booking-section-hint">
          You don't have any completed sessions to review yet. Once a booked session has passed, it'll show up here ready for a review.
        </p>
      </Modal>
    );
  }

  return (
    <Modal title="Write a Review" onClose={onClose}>
      <form onSubmit={handleSubmit} className="mystudents-edit-form">
        <label className="field">
          <span>Session</span>
          <select value={bookingId} onChange={(e) => setBookingId(e.target.value)} required>
            {reviewableBookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.tutorName} — {b.subject} ({formatSessionDate(b.date, b.startTime)})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Rating</span>
          <div className="reviews-rating-input">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={n <= rating ? 'active' : ''} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
                <StarIcon />
              </button>
            ))}
          </div>
        </label>

        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Excellent tutor!" required minLength={2} maxLength={120} />
        </label>

        <label className="field">
          <span>Your review</span>
          <textarea className="booking-textarea" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share what stood out about this session..." required minLength={2} maxLength={1000} />
        </label>

        <span className="field-label-standalone">Tags (optional)</span>
        <div className="reviews-tag-grid">
          {REVIEW_TAGS.map((tag) => (
            <button key={tag} type="button" className={tags.includes(tag) ? 'disc-tag active' : 'disc-tag'} onClick={() => toggleTag(tag)}>
              {tag}
            </button>
          ))}
        </div>

        {error && <p className="photo-uploader-error">{error}</p>}

        <button type="submit" className="btn btn-primary full" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Review'}</button>
      </form>
    </Modal>
  );
}
