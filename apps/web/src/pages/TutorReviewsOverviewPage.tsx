import { useEffect, useMemo, useState } from 'react';
import type { TutorReviewDto } from '@mentora/shared';
import { apiRequest } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { CheckIcon, ShareIcon, StarIcon } from '../components/Icons';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
function Stars({ rating }: { rating: number }) { return <span className="reviews-stars" aria-label={`${rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <StarIcon key={i} className={i < Math.round(rating) ? 'star-filled' : 'star-empty'} />)}</span>; }

export function TutorReviewsPage() {
  const [reviews, setReviews] = useState<TutorReviewDto[] | null>(null);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sort, setSort] = useState<'recent' | 'highest'>('recent');
  const [copied, setCopied] = useState(false);
  useEffect(() => { apiRequest<{ reviews: TutorReviewDto[] }>('/api/tutor/dashboard/reviews').then((r) => setReviews(r.data?.reviews ?? [])).catch(() => setReviews([])); }, []);
  const metrics = useMemo(() => {
    const items = reviews ?? [];
    const counts = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: items.filter((r) => r.rating === rating).length }));
    const average = items.length ? items.reduce((sum, item) => sum + item.rating, 0) / items.length : 0;
    const tags = new Map<string, number>();
    items.flatMap((item) => item.tags).forEach((tag) => tags.set(tag, (tags.get(tag) ?? 0) + 1));
    return { counts, average, qualities: [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4) };
  }, [reviews]);
  const visible = useMemo(() => (reviews ?? []).filter((r) => !ratingFilter || r.rating === ratingFilter).sort((a, b) => sort === 'highest' ? b.rating - a.rating : +new Date(b.createdAt) - +new Date(a.createdAt)), [reviews, ratingFilter, sort]);
  async function copyProfile() { await navigator.clipboard.writeText(`${window.location.origin}/tutor/profile`).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }).catch(() => {}); }
  const percentage = (count: number) => reviews?.length ? Math.round(count / reviews.length * 100) : 0;
  return <div className="tutor-reviews-page">
    <header className="tutor-page-heading"><div><h1>Reviews</h1><p>See what your students and parents are saying about you.</p></div></header>
    <div className="reviews-layout"><main className="reviews-main">
      <section className="dash-card reviews-summary"><div className="reviews-overall"><small>Overall rating</small><strong>{metrics.average ? metrics.average.toFixed(1) : '—'}</strong><Stars rating={metrics.average} /><span>Based on {reviews?.length ?? 0} reviews</span></div><div className="reviews-breakdown">{metrics.counts.map(({ rating, count }) => <div key={rating}><span>{rating} star</span><div><i style={{ width: `${percentage(count)}%` }} /></div><small>{count} ({percentage(count)}%)</small></div>)}</div><div className="reviews-qualities"><small>Top qualities</small>{metrics.qualities.length ? metrics.qualities.map(([tag]) => <span key={tag}><CheckIcon /> {tag}</span>) : <span>No qualities yet</span>}</div><div className="reviews-response"><small>Response rate</small><strong>100%</strong><span>You respond to all messages</span></div></section>
      <section className="dash-card reviews-feed"><div className="reviews-toolbar"><div>{[0, 5, 4, 3, 2, 1].map((rating) => <button type="button" key={rating} className={ratingFilter === rating ? 'active' : ''} onClick={() => setRatingFilter(rating)}>{rating ? `${rating} Stars (${metrics.counts.find((c) => c.rating === rating)?.count ?? 0})` : `All Reviews (${reviews?.length ?? 0})`}</button>)}</div><select aria-label="Sort reviews" value={sort} onChange={(e) => setSort(e.target.value as 'recent' | 'highest')}><option value="recent">Most recent</option><option value="highest">Highest rated</option></select></div>{reviews === null ? <p className="reviews-empty">Loading reviews…</p> : visible.length === 0 ? <p className="reviews-empty">No reviews in this category yet.</p> : visible.map((review) => <article className="review-entry" key={review.id}><Avatar name={review.parentName} className="review-avatar" /><div className="review-author"><strong>{review.parentName}</strong><span>{review.studentName}</span><small>Session on {formatDate(review.createdAt)}</small></div><div className="review-content"><div><Stars rating={review.rating} /><strong>{review.rating.toFixed(1)}</strong><time>{formatDate(review.createdAt)}</time></div>{review.title && <h3>{review.title}</h3>}<p>{review.body}</p><div className="profile-chip-list">{review.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></article>)}</section>
    </main><aside className="reviews-aside"><section className="dash-card"><h2>Rating breakdown</h2><div className="reviews-breakdown">{metrics.counts.map(({ rating, count }) => <div key={rating}><span>{rating} stars</span><div><i style={{ width: `${percentage(count)}%` }} /></div><small>{count}</small></div>)}</div></section><section className="dash-card"><h2>Share your profile</h2><p>More great reviews can help you attract more students.</p><button type="button" className="btn btn-secondary full" onClick={copyProfile}><ShareIcon /> {copied ? 'Link copied' : 'Copy profile link'}</button></section></aside></div>
  </div>;
}
