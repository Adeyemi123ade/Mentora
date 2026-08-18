import { useEffect, useMemo, useState } from 'react';
import type { TutorReviewDto } from '@mentora/shared';
import { apiRequest } from '../lib/api';
import { StarIcon } from '../components/Icons';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="reviews-stars-lg" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} className={i < rating ? 'star-filled' : 'star-empty'} />
      ))}
    </span>
  );
}

export function TutorReviewsPage() {
  const [reviews, setReviews] = useState<TutorReviewDto[] | null>(null);

  useEffect(() => {
    apiRequest<{ reviews: TutorReviewDto[] }>('/api/tutor/dashboard/reviews')
      .then((r) => setReviews(r.data?.reviews ?? []))
      .catch(() => setReviews([]));
  }, []);

  const avgRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;
    return (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div className="tdash-home">
      <div className="pay-header">
        <div>
          <h1>Reviews</h1>
          <p className="booking-section-hint">What parents are saying after your sessions.</p>
        </div>
      </div>

      <div className="mystudents-stats-grid">
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-orange"><StarIcon /></span>
          <div><strong>{avgRating ?? '—'}</strong><span>Average rating</span></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-blue"><StarIcon /></span>
          <div><strong>{reviews?.length ?? '—'}</strong><span>Total reviews</span></div>
        </div>
      </div>

      <section className="dash-card">
        {reviews === null ? null : reviews.length === 0 ? (
          <div className="mystudents-empty"><p>No reviews yet. They'll show up here after a parent reviews one of your sessions.</p></div>
        ) : (
          <div className="reviews-list">
            {reviews.map((r) => (
              <div key={r.id} className="reviews-card">
                <div className="reviews-card-body">
                  <div className="reviews-card-head">
                    <strong>{r.parentName} · {r.studentName}</strong>
                    <div className="reviews-card-head-right">
                      <Stars rating={r.rating} />
                      <span className="tprofile-response-time">{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <h3 className="reviews-title">{r.title}</h3>
                  <p className="reviews-body-text">{r.body}</p>
                  {r.tags.length > 0 && (
                    <div className="tutor-onb-chips">
                      {r.tags.map((t) => <span key={t} className="tutor-onb-chip">{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
