import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TutorStudentDto, TutorBookingDto, TutorReviewDto } from '@mentora/shared';
import { apiRequest, ApiError } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import {
  UsersIcon,
  BookIcon,
  ChartIcon,
  StarIcon,
  SearchIcon,
  SlidersIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  DotsIcon,
  ChatIcon,
  EditIcon,
  CalendarIcon,
  PlusIcon,
  ClipboardIcon,
  CheckIcon,
} from '../components/Icons';

const PAGE_SIZE = 5;

function progressLabel(percent: number): { text: string; tone: string } {
  if (percent >= 90) return { text: 'Excellent', tone: 'excellent' };
  if (percent >= 75) return { text: 'On track', tone: 'ontrack' };
  if (percent >= 50) return { text: 'Improving', tone: 'improving' };
  return { text: 'Needs attention', tone: 'attention' };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function latestTopicFor(studentName: string, bookings: TutorBookingDto[] | null): string | null {
  const matches = (bookings ?? [])
    .filter((b) => b.studentName === studentName && b.specificTopic)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return matches[0]?.specificTopic ?? null;
}

function isActiveStudent(studentName: string, bookings: TutorBookingDto[] | null): boolean {
  const cutoff = Date.now() - 60 * 86_400_000;
  return (bookings ?? []).some((b) => b.studentName === studentName && b.status !== 'CANCELLED' && new Date(b.date).getTime() >= cutoff);
}

export function TutorStudentsPage() {
  const [students, setStudents] = useState<TutorStudentDto[] | null>(null);
  const [bookings, setBookings] = useState<TutorBookingDto[] | null>(null);
  const [reviews, setReviews] = useState<TutorReviewDto[] | null>(null);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [noteModalStudent, setNoteModalStudent] = useState<TutorStudentDto | null>(null);
  const [reportStudent, setReportStudent] = useState<TutorStudentDto | null>(null);

  function loadStudents() {
    apiRequest<{ students: TutorStudentDto[] }>('/api/tutor/dashboard/students')
      .then((r) => {
        const list = r.data?.students ?? [];
        setStudents(list);
        if (list.length > 0 && !selectedId) setSelectedId(list[0].studentId);
      })
      .catch(() => setStudents([]));
  }

  useEffect(loadStudents, []);
  useEffect(() => {
    apiRequest<{ bookings: TutorBookingDto[] }>('/api/tutor/dashboard/bookings').then((r) => setBookings(r.data?.bookings ?? [])).catch(() => setBookings([]));
    apiRequest<{ reviews: TutorReviewDto[] }>('/api/tutor/dashboard/reviews').then((r) => setReviews(r.data?.reviews ?? [])).catch(() => setReviews([]));
  }, []);

  const subjectOptions = useMemo(() => Array.from(new Set((students ?? []).flatMap((s) => s.subjects))).sort(), [students]);
  const gradeOptions = useMemo(() => Array.from(new Set((students ?? []).map((s) => s.grade).filter((g): g is string => Boolean(g)))).sort(), [students]);

  const filtered = useMemo(() => {
    let list = students ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.fullName.toLowerCase().includes(q));
    }
    if (subjectFilter) list = list.filter((s) => s.subjects.includes(subjectFilter));
    if (gradeFilter) list = list.filter((s) => s.grade === gradeFilter);
    return list;
  }, [students, search, subjectFilter, gradeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const now = new Date();
  const activeSessionsThisMonth = (bookings ?? []).filter((b) => {
    const d = new Date(b.date);
    return b.status !== 'CANCELLED' && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const progressSet = (students ?? []).filter((s) => s.progressPercent > 0 || s.progressNote);
  const avgProgress = progressSet.length > 0 ? Math.round(progressSet.reduce((sum, s) => sum + s.progressPercent, 0) / progressSet.length) : null;

  const avgRating = reviews && reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;

  const selected = students?.find((s) => s.studentId === selectedId) ?? null;
  const selectedBookings = (bookings ?? []).filter((b) => b.studentName === selected?.fullName).slice(0, 5);

  function handleProgressSaved() {
    setNoteModalStudent(null);
    loadStudents();
  }

  return (
    <div className="tdash-home">
      <div className="pay-header">
        <div>
          <h1>Students</h1>
          <p className="booking-section-hint">View and manage your students and their learning progress.</p>
        </div>
      </div>

      <div className="mystudents-stats-grid">
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-blue"><UsersIcon /></span>
          <div><strong>{students?.length ?? '—'}</strong><span>Total students</span></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-green"><BookIcon /></span>
          <div><strong>{activeSessionsThisMonth}</strong><span>Active sessions this month</span></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-orange"><ChartIcon /></span>
          <div><strong>{avgProgress !== null ? `${avgProgress}%` : '—'}</strong><span>Avg. progress</span></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-purple"><StarIcon /></span>
          <div><strong>{avgRating ?? '—'}</strong><span>Avg. rating{reviews && reviews.length > 0 ? ` (${reviews.length})` : ''}</span></div>
        </div>
      </div>

      <div className="tbook-tabs-row">
        <div className="tbook-search-row">
          <div className="pay-search"><SearchIcon /><input type="text" placeholder="Search students..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}>
            <option value="">All subjects</option>
            {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}>
            <option value="">All grades</option>
            {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <span className="tbook-filter-btn"><SlidersIcon /> Filter</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!selected}
          onClick={() => selected && setNoteModalStudent(selected)}
          title={selected ? `Add a progress note for ${selected.fullName}` : 'Select a student first'}
        >
          <PlusIcon /> Add note
        </button>
      </div>

      <section className="dash-card">
        {students === null ? null : filtered.length === 0 ? (
          <div className="mystudents-empty"><p>{students.length === 0 ? "No students yet. They'll show up here once a parent books a session with you." : 'No students match.'}</p></div>
        ) : (
          <>
            <div className="tstud-table-scroll">
            <div className="tstud-table">
              <div className="tstud-table-head">
                <span>Student</span><span>Subject</span><span>Grade</span><span>Progress</span><span>Last session</span><span>Actions</span>
              </div>
              {pageItems.map((s) => {
                const pl = progressLabel(s.progressPercent);
                const topic = latestTopicFor(s.fullName, bookings);
                return (
                  <div key={s.studentId} className="tstud-table-row">
                    <div className="tstud-student-cell">
                      <Avatar name={s.fullName} photoUrl={s.photoUrl} className="msgs-conv-avatar" />
                      <strong>{s.fullName}</strong>
                    </div>
                    <div className="tstud-subject-cell">
                      <span>{s.subjects[0] ?? '—'}{s.subjects.length > 1 ? ` +${s.subjects.length - 1}` : ''}</span>
                      {topic && <em>{topic}</em>}
                    </div>
                    <span>{s.grade ?? '—'}</span>
                    <div className="tstud-progress-cell">
                      <strong className={`tstud-progress-pct ${pl.tone}`}>{s.progressPercent}%</strong>
                      <div className="tstud-progress-bar"><span className={pl.tone} style={{ width: `${s.progressPercent}%` }} /></div>
                      <span className={`tstud-progress-label ${pl.tone}`}>{s.progressPercent > 0 || s.progressNote ? pl.text : 'Not set'}</span>
                    </div>
                    <span className="tstud-lastsession"><CalendarIcon /> {formatDate(s.lastSessionDate)}</span>
                    <div className="tstud-actions-cell">
                      <button type="button" className="btn btn-secondary" onClick={() => setSelectedId(s.studentId)}>View</button>
                      <div className="tbook-menu-wrap">
                        <button type="button" className="mystudents-menu-trigger" onClick={() => setMenuOpenId((v) => (v === s.studentId ? null : s.studentId))} aria-label="More actions"><DotsIcon /></button>
                        {menuOpenId === s.studentId && (
                          <div className="mystudents-menu tbook-menu" role="menu">
                            <button role="menuitem" onClick={() => { setSelectedId(s.studentId); setMenuOpenId(null); }}>View overview</button>
                            <button role="menuitem" onClick={() => { setNoteModalStudent(s); setMenuOpenId(null); }}>Add / edit note</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>

            <div className="tstud-pagination">
              <span>Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} students</span>
              <div className="tstud-pagination-btns">
                <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeftIcon /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                  <button key={p} type="button" className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRightIcon /></button>
              </div>
            </div>
          </>
        )}
      </section>

      <aside className="tdash-home-sidebar">
        {selected && (
          <section className="dash-card">
            <h2>Student overview</h2>
            <div className="tstud-overview-head">
              <Avatar name={selected.fullName} photoUrl={selected.photoUrl} className="tdash-profile-avatar" />
              <div>
                <strong>{selected.fullName}</strong>
                <span>{[selected.grade, selected.subjects[0] ? `${selected.subjects[0]} Student` : null].filter(Boolean).join(' · ') || 'Details not set'}</span>
              </div>
              {isActiveStudent(selected.fullName, bookings) && <span className="dash-status-pill online">Active student</span>}
            </div>
            <div className="tstud-overview-rows">
              <div><BookIcon /> <span>Subjects</span><strong>{selected.subjects.join(', ') || '—'}</strong></div>
              <div><CalendarIcon /> <span>Sessions completed</span><strong>{selected.sessionsCount}</strong></div>
              <div><ChartIcon /> <span>Progress</span><strong>{selected.progressPercent}%</strong></div>
              <div><StarIcon /> <span>Rating</span><strong>{selected.rating !== null ? `${selected.rating} (${selected.reviewCount})` : 'No reviews yet'}</strong></div>
            </div>
          </section>
        )}

        {selected && (
          <section className="dash-card">
            <h2>Recent sessions</h2>
            {selectedBookings.length === 0 ? (
              <p className="booking-section-hint">No sessions yet.</p>
            ) : (
              <div className="tstud-recent-list">
                {selectedBookings.map((b) => (
                  <div key={b.id} className="tstud-recent-row">
                    <span>{formatDate(b.date)}<em>{b.startTime} – {b.endTime}</em></span>
                    <span className={`dash-status-pill ${b.status === 'CANCELLED' ? 'busy' : 'online'}`}>{b.status === 'CANCELLED' ? 'Cancelled' : b.status === 'COMPLETED' ? 'Completed' : 'Scheduled'}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {selected && (
          <section className="dash-card tdash-quicklinks">
            <h2>Quick actions</h2>
            <Link to={`/tutor/messages?parent=${selected.parentId}`}><ChatIcon /> Send message <ChevronRightIcon /></Link>
            <button type="button" onClick={() => setNoteModalStudent(selected)}><EditIcon /> Add / edit note <ChevronRightIcon /></button>
            <button type="button" onClick={() => setReportStudent(selected)}><ClipboardIcon /> View progress report <ChevronRightIcon /></button>
            <Link to="/tutor/bookings"><CalendarIcon /> View all bookings <ChevronRightIcon /></Link>
          </section>
        )}
      </aside>

      {noteModalStudent && <ProgressModal student={noteModalStudent} onClose={() => setNoteModalStudent(null)} onSaved={handleProgressSaved} />}
      {reportStudent && (
        <ProgressReportModal
          student={reportStudent}
          bookings={(bookings ?? []).filter((b) => b.studentName === reportStudent.fullName)}
          onClose={() => setReportStudent(null)}
        />
      )}
    </div>
  );
}

function ProgressModal({ student, onClose, onSaved }: { student: TutorStudentDto; onClose: () => void; onSaved: () => void }) {
  const [percent, setPercent] = useState(student.progressPercent);
  const [note, setNote] = useState(student.progressNote ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/api/tutor/dashboard/students/${student.studentId}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ progressPercent: percent, note: note.trim() || undefined }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`${student.fullName} — Progress`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="mystudents-edit-form">
        <label className="field">
          <span>Progress ({percent}%)</span>
          <input type="range" min={0} max={100} step={5} value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Note (optional)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} rows={4} placeholder="How is this student progressing?" />
        </label>
        {error && <p className="photo-uploader-error">{error}</p>}
        <button type="submit" className="btn btn-primary full" disabled={submitting}>{submitting ? 'Saving…' : 'Save progress'}</button>
      </form>
    </Modal>
  );
}

function ProgressReportModal({ student, bookings, onClose }: { student: TutorStudentDto; bookings: TutorBookingDto[]; onClose: () => void }) {
  const pl = progressLabel(student.progressPercent);
  const sorted = [...bookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const completed = sorted.filter((b) => b.status === 'COMPLETED');

  return (
    <Modal title={`${student.fullName} — Progress report`} onClose={onClose}>
      <div className="tstud-report">
        <div className="tstud-report-summary">
          <div>
            <span>Overall progress</span>
            <strong className={pl.tone}>{student.progressPercent}% · {pl.text}</strong>
          </div>
          <div>
            <span>Sessions completed</span>
            <strong>{student.sessionsCount}</strong>
          </div>
          <div>
            <span>Rating</span>
            <strong>{student.rating !== null ? `${student.rating} (${student.reviewCount})` : 'No reviews yet'}</strong>
          </div>
          <div>
            <span>Subjects</span>
            <strong>{student.subjects.join(', ') || '—'}</strong>
          </div>
        </div>

        {student.progressNote && (
          <div className="tstud-report-note">
            <span>Tutor's note</span>
            <p>"{student.progressNote}"</p>
          </div>
        )}

        <h3>Session history</h3>
        {completed.length === 0 ? (
          <p className="booking-section-hint">No completed sessions yet.</p>
        ) : (
          <div className="tstud-recent-list">
            {completed.slice(0, 10).map((b) => (
              <div key={b.id} className="tstud-recent-row">
                <span>{formatDate(b.date)}<em>{b.subject}{b.specificTopic ? ` — ${b.specificTopic}` : ''}</em></span>
                <span className="dash-status-pill online"><CheckIcon /> Completed</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
