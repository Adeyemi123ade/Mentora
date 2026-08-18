import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { SavedTutor, PublicTutorDto } from '@mentora/shared';
import { CATEGORY_LABELS } from '../data/tutors';
import type { CategoryKey, Tutor } from '../data/tutors';
import { adaptPublicTutor } from '../lib/tutorAdapter';
import { apiRequest, ApiError } from '../lib/api';
import { InitialsAvatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import {
  HeartIcon,
  CalendarIcon,
  StarIcon,
  ClockIcon,
  TrophyIcon,
  UsersIcon,
  PinIcon,
  ChatIcon,
  DotsIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  GraduationCapIcon,
  SearchIcon,
  SlidersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../components/Icons';

const PAGE_SIZE = 6;

type Row = { saved: SavedTutor; tutor: Tutor };

function formatSavedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SavedTutorsPage() {
  const [savedTutors, setSavedTutors] = useState<SavedTutor[] | null>(null);
  const [recentlyViewedCount, setRecentlyViewedCount] = useState(0);
  const [tab, setTab] = useState<'all' | 'today' | 'recent'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<'all' | CategoryKey>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<Row | null>(null);
  const [reasonsDismissed, setReasonsDismissed] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [realTutors, setRealTutors] = useState<Map<string, Tutor>>(new Map());

  useEffect(() => {
    apiRequest<{ saved: SavedTutor[] }>('/api/saved-tutors').then((r) => setSavedTutors(r.data?.saved ?? [])).catch(() => setSavedTutors([]));
    apiRequest<{ count: number }>('/api/tutor-views/recent-count').then((r) => setRecentlyViewedCount(r.data?.count ?? 0)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!savedTutors) return;
    const missingIds = savedTutors.map((s) => s.tutorId).filter((id) => !realTutors.has(id));
    if (missingIds.length === 0) return;
    Promise.all(
      missingIds.map((id) =>
        apiRequest<{ tutor: PublicTutorDto }>(`/api/tutors/${id}`)
          .then((r) => [id, r.data?.tutor ?? null] as const)
          .catch(() => [id, null] as const),
      ),
    ).then((results) => {
      setRealTutors((prev) => {
        const next = new Map(prev);
        for (const [id, dto] of results) {
          if (dto) next.set(id, adaptPublicTutor(dto));
        }
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedTutors]);

  const rows: Row[] = useMemo(() => {
    return (savedTutors ?? [])
      .map((saved) => {
        const tutor = realTutors.get(saved.tutorId);
        return tutor ? { saved, tutor } : null;
      })
      .filter((r): r is Row => r !== null);
  }, [savedTutors, realTutors]);

  const availableTodayRows = rows.filter((r) => r.tutor.availability === 'now');
  const recentlyAddedRows = rows.filter((r) => {
    const days = (Date.now() - new Date(r.saved.createdAt).getTime()) / 86_400_000;
    return days <= 7;
  });

  const avgRating = rows.length > 0 ? Math.round((rows.reduce((sum, r) => sum + r.tutor.rating, 0) / rows.length) * 10) / 10 : null;

  const tabRows = tab === 'today' ? availableTodayRows : tab === 'recent' ? recentlyAddedRows : rows;

  const filteredRows = tabRows.filter((r) => {
    const term = searchTerm.trim().toLowerCase();
    if (term && !`${r.tutor.name} ${r.tutor.title} ${r.tutor.tags.join(' ')}`.toLowerCase().includes(term)) return false;
    if (category !== 'all' && r.tutor.category !== category) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const notedRows = rows.filter((r) => r.saved.note).slice(0, 4);

  async function handleUnsave(tutorId: string) {
    setOpenMenuId(null);
    setSavedTutors((prev) => prev?.filter((s) => s.tutorId !== tutorId) ?? prev);
    try {
      await apiRequest(`/api/saved-tutors/${tutorId}`, { method: 'DELETE' });
    } catch {
      apiRequest<{ saved: SavedTutor[] }>('/api/saved-tutors').then((r) => setSavedTutors(r.data?.saved ?? [])).catch(() => {});
    }
  }

  function changeTab(next: 'all' | 'today' | 'recent') {
    setTab(next);
    setPage(1);
  }

  return (
    <div className="savedtutors-page">
      <div className="savedtutors-header">
        <div>
          <h1><HeartIcon className="savedtutors-heart-title" /> Saved Tutors</h1>
          <p>Tutors you've saved for future learning sessions.</p>
        </div>
        <Link to="/dashboard/tutors" className="btn btn-secondary">+ Find More Tutors</Link>
      </div>

      <div className="mystudents-stats-grid">
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-blue"><HeartIcon /></span>
          <div><strong>{rows.length}</strong><span>Saved Tutors</span><em>Across all subjects</em></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-green"><CalendarIcon /></span>
          <div><strong>{availableTodayRows.length}</strong><span>Available Today</span><em>Ready to book</em></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-purple"><StarIcon /></span>
          <div><strong>{avgRating ?? '—'}</strong><span>Avg. Rating</span><em>From your saved tutors</em></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-orange"><ClockIcon /></span>
          <div><strong>{recentlyViewedCount}</strong><span>Recently Viewed</span><em>Last 7 days</em></div>
        </div>
      </div>

      {savedTutors === null ? null : rows.length === 0 ? (
        <div className="mystudents-empty">
          <p>You haven't saved any tutors yet.</p>
          <Link to="/dashboard/tutors" className="btn btn-primary">Find a Tutor <span aria-hidden="true">→</span></Link>
        </div>
      ) : (
        <>
          <div className="savedtutors-toolbar">
            <nav className="savedtutors-tabs">
              <button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => changeTab('all')}>All Tutors ({rows.length})</button>
              <button type="button" className={tab === 'today' ? 'active' : ''} onClick={() => changeTab('today')}>Available Today ({availableTodayRows.length})</button>
              <button type="button" className={tab === 'recent' ? 'active' : ''} onClick={() => changeTab('recent')}>Recently Added ({recentlyAddedRows.length})</button>
            </nav>

            <label className="disc-search-input savedtutors-search">
              <SearchIcon />
              <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Search saved tutors..." />
            </label>

            <div className="savedtutors-filters">
              <button type="button" className="btn btn-secondary" onClick={() => setFiltersOpen((v) => !v)}>
                <SlidersIcon /> Filters
              </button>
              {filtersOpen && (
                <div className="disc-student-menu savedtutors-filter-menu" role="menu">
                  <button type="button" role="menuitem" className={category === 'all' ? 'active' : ''} onClick={() => { setCategory('all'); setPage(1); setFiltersOpen(false); }}>All Categories</button>
                  {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((key) => (
                    <button key={key} type="button" role="menuitem" className={category === key ? 'active' : ''} onClick={() => { setCategory(key); setPage(1); setFiltersOpen(false); }}>
                      {CATEGORY_LABELS[key]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {pageRows.length === 0 ? (
            <div className="mystudents-empty">
              <p>No saved tutors match your search.</p>
            </div>
          ) : (
            <div className="savedtutors-list">
              {pageRows.map((row) => (
                <SavedTutorRow
                  key={row.tutor.id}
                  row={row}
                  menuOpen={openMenuId === row.tutor.id}
                  onToggleMenu={() => setOpenMenuId(openMenuId === row.tutor.id ? null : row.tutor.id)}
                  onUnsave={() => handleUnsave(row.tutor.id)}
                  onAddNote={() => { setNoteModal(row); setOpenMenuId(null); }}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="disc-pagination" aria-label="Saved tutor pages">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                <ChevronLeftIcon />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" className={n === currentPage ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page">
                <ChevronRightIcon />
              </button>
            </nav>
          )}

          {!reasonsDismissed && (
            <section className="dash-card savedtutors-reasons">
              <div className="tprofile-section-heading spread">
                <h2 className="dash-goals-title">Why you saved these tutors</h2>
                <button type="button" className="dash-sticky-close" aria-label="Dismiss" onClick={() => setReasonsDismissed(true)}><XIcon /></button>
              </div>
              {notedRows.length > 0 ? (
                <div className="savedtutors-reason-grid">
                  {notedRows.map((r) => (
                    <div key={r.tutor.id} className="savedtutors-reason-card">
                      <span className="tprofile-badge tone-green"><CheckIcon /></span>
                      <p>"{r.saved.note}"</p>
                      <span>Saved on {formatSavedDate(r.saved.createdAt)} · {r.tutor.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="booking-section-hint">
                  Add a note when you save a tutor (via the ••• menu) to remember what made them a great fit — it'll show up here.
                </p>
              )}
            </section>
          )}

          {!bannerDismissed && (
            <div className="dash-sticky-banner">
              <span className="dash-sticky-icon"><GraduationCapIcon /></span>
              <div className="dash-sticky-copy">
                <strong>Still looking for the perfect tutor?</strong>
                <span>Explore more verified tutors matched to your child's needs.</span>
              </div>
              <Link to="/dashboard/tutors" className="btn btn-primary">Find More Tutors <span aria-hidden="true">→</span></Link>
              <button type="button" className="dash-sticky-close" aria-label="Dismiss" onClick={() => setBannerDismissed(true)}><XIcon /></button>
            </div>
          )}
        </>
      )}

      {noteModal && (
        <NoteModal
          row={noteModal}
          onClose={() => setNoteModal(null)}
          onSaved={(updated) => {
            setSavedTutors((prev) => prev?.map((s) => (s.tutorId === updated.tutorId ? updated : s)) ?? prev);
            setNoteModal(null);
          }}
        />
      )}
    </div>
  );
}

function SavedTutorRow({
  row,
  menuOpen,
  onToggleMenu,
  onUnsave,
  onAddNote,
}: {
  row: Row;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onUnsave: () => void;
  onAddNote: () => void;
}) {
  const { tutor } = row;
  return (
    <article className="savedtutors-row">
      {tutor.photo ? (
        <img src={tutor.photo} alt="" aria-hidden="true" className="savedtutors-photo" />
      ) : (
        <InitialsAvatar name={tutor.name} className="savedtutors-photo" />
      )}

      <div className="savedtutors-info">
        <h3>{tutor.name} {tutor.verified && <CheckIcon className="dash-verified-icon" />}</h3>
        <p className="disc-tutor-title">{tutor.title}</p>
        <div className="dash-tutor-meta">
          <StarIcon className="dash-tutor-rating-icon" />
          {tutor.reviews > 0 ? <><span>{tutor.rating}</span><span className="dash-tutor-reviews">({tutor.reviews} reviews)</span></> : <span className="dash-tutor-reviews">No reviews yet</span>}
        </div>
        <div className="disc-tutor-tags">
          {tutor.tags.slice(0, 3).map((t) => <span key={t} className="disc-tag">{t}</span>)}
          {tutor.tags.length > 3 && <span className="disc-tag">+{tutor.tags.length - 3}</span>}
        </div>
      </div>

      <div className="savedtutors-meta-col">
        <span><TrophyIcon /> {tutor.experienceYears > 0 ? `${tutor.experienceYears}+ years experience` : 'Experience not specified'}</span>
        <span><UsersIcon /> {tutor.studentsTaught > 0 ? `${tutor.studentsTaught} students taught` : 'No students yet'}</span>
        {tutor.location && <span><PinIcon /> {tutor.location}</span>}
      </div>

      <div className="savedtutors-action-col">
        <span className="savedtutors-price">{tutor.price > 0 ? `From ₦${tutor.price.toLocaleString()} / session` : 'Price not set'}</span>
        <span className={tutor.status === 'Online' ? 'dash-status-pill online' : 'dash-status-pill busy'}>{tutor.availabilityLabel}</span>
        <Link to={`/dashboard/tutors/${tutor.id}/book`} className="btn btn-primary"><CalendarIcon /> Book a Session</Link>
        <Link to={`/dashboard/messages?tutor=${tutor.id}`} className="btn btn-secondary">Message</Link>
      </div>

      <div className="savedtutors-corner">
        <button type="button" className="savedtutors-heart active" aria-label={`Unsave ${tutor.name}`} onClick={onUnsave}>
          <HeartIcon />
        </button>
        <button type="button" className="mystudents-menu-trigger" onClick={onToggleMenu} aria-label="More actions">
          <DotsIcon />
        </button>
        {menuOpen && (
          <div className="mystudents-menu savedtutors-menu" role="menu">
            <Link role="menuitem" to={`/dashboard/tutors/${tutor.id}`}><UsersIcon /> View Profile</Link>
            <button type="button" role="menuitem" onClick={onAddNote}><EditIcon /> {row.saved.note ? 'Edit Note' : 'Add a Note'}</button>
            <button type="button" role="menuitem" className="danger" onClick={onUnsave}><TrashIcon /> Remove</button>
          </div>
        )}
      </div>
    </article>
  );
}

function NoteModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: (s: SavedTutor) => void }) {
  const [note, setNote] = useState(row.saved.note ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ saved: SavedTutor }>(`/api/saved-tutors/${row.tutor.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      });
      if (res.data?.saved) onSaved(res.data.saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Note about ${row.tutor.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="mystudents-edit-form">
        <label className="field">
          <span>What made {row.tutor.name.split(' ')[0]} a great fit?</span>
          <textarea className="booking-textarea" rows={3} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Explains concepts so clearly." />
        </label>
        <span className="booking-char-count">{note.length}/280</span>
        {error && <p className="photo-uploader-error">{error}</p>}
        <button type="submit" className="btn btn-primary full" disabled={submitting}>{submitting ? 'Saving…' : 'Save Note'}</button>
      </form>
    </Modal>
  );
}
