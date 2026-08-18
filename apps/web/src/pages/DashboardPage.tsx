import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Student, Notification, Booking, PublicTutorDto, SavedTutor } from '@mentora/shared';
import mentoraLogo from '../assets/mentora-logo.jpg';
import { apiRequest, ApiError, logout } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { ThemeToggle } from '../components/ThemeToggle';
import { ReferralModal } from '../components/ReferralModal';
import { formatBookingDate } from '../lib/scheduling';
import {
  HomeIcon,
  SearchIcon,
  CalendarIcon,
  ChatIcon,
  UsersIcon,
  BookmarkIcon,
  StarIcon,
  WalletIcon,
  SettingsIcon,
  BellIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DiamondIcon,
  MathIcon,
  BriefcaseIcon,
  VideoIcon,
  PinIcon,
  RobotIcon,
  CodeIcon,
  MicIcon,
  ChartIcon,
  TrophyIcon,
  LightbulbIcon,
  CheckIcon,
  XIcon,
  MenuIcon,
  LogOutIcon,
} from '../components/Icons';

type NavItem = { label: string; icon: (props: { className?: string }) => JSX.Element; path: string; badge?: number };

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: HomeIcon, path: '/dashboard' },
  { label: 'Find a Tutor', icon: SearchIcon, path: '/dashboard/tutors' },
  { label: 'My Bookings', icon: CalendarIcon, path: '/dashboard/bookings' },
  { label: 'Messages', icon: ChatIcon, path: '/dashboard/messages' },
  { label: 'My Students', icon: UsersIcon, path: '/dashboard/students' },
  { label: 'Saved Tutors', icon: BookmarkIcon, path: '/dashboard/saved' },
  { label: 'Payments', icon: WalletIcon, path: '/dashboard/payments' },
  { label: 'Settings', icon: SettingsIcon, path: '/dashboard/settings' },
];

const ROLE_DISPLAY: Record<string, string> = {
  PARENT: 'Parent',
  STUDENT: 'Student Account',
  TUTOR: 'Tutor Account',
  ADMIN: 'Admin Account',
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const isHome = location.pathname === '/dashboard';

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user?.role === 'TUTOR') {
      navigate('/tutor');
    }
  }, [user?.role, navigate]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ notifications: Notification[] }>('/api/notifications')
      .then((res) => {
        if (!cancelled) setUnreadCount((res.data?.notifications ?? []).filter((n) => !n.readAt).length);
      })
      .catch(() => {});
    apiRequest<{ count: number }>('/api/messages/unread-count')
      .then((res) => {
        if (!cancelled) setUnreadMessages(res.data?.count ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const navItems = NAV_ITEMS.map((item) => (item.path === '/dashboard/messages' ? { ...item, badge: unreadMessages || undefined } : item));

  return (
    <div className={`dash-layout ${isHome ? 'dash-home-layout' : 'dash-internal-layout'}`}>
      {sidebarOpen && <div className="dash-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      <aside className={sidebarOpen ? 'dash-sidebar open' : 'dash-sidebar'}>
        <div className="dash-brand">
          <img src={mentoraLogo} alt="" aria-hidden="true" className="brand-logo-img" />
          <span>Mentora</span>
          <button type="button" className="dash-sidebar-close" aria-label="Close menu" onClick={() => setSidebarOpen(false)}>
            <XIcon />
          </button>
        </div>

        <nav className="dash-nav" aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={active ? 'dash-nav-link active' : 'dash-nav-link'} onClick={() => setSidebarOpen(false)}>
                <Icon />
                <span>{item.label}</span>
                {item.badge ? <span className="dash-nav-badge">{item.badge}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="dash-refer-card">
          <span className="dash-refer-icon"><DiamondIcon /></span>
          <strong>Invite Friends</strong>
          <p>Share Mentora with parents and learners.</p>
          <button type="button" className="dash-refer-link" onClick={() => setReferralOpen(true)}>Invite Now <ChevronRightIcon /></button>
        </div>

        <Link to="/dashboard/settings" className="dash-user-switcher" aria-label="Open parent profile and settings">
          {user ? <Avatar name={user.name} photoUrl={user.photoUrl} className="dash-user-avatar" /> : <span className="initials-avatar dash-user-avatar">…</span>}
          <span className="dash-user-switcher-text">
            <strong>{user?.name ?? 'Loading…'}</strong>
            <span>{user ? (ROLE_DISPLAY[user.role] ?? user.role) : ''}</span>
          </span>
          <ChevronDownIcon />
        </Link>

        <button type="button" className="dash-sidebar-logout" onClick={() => logout(navigate)}>
          <LogOutIcon />
          <span>Log Out</span>
        </button>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <button type="button" className="dash-menu-toggle" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
            <MenuIcon />
          </button>

          <Link to="/dashboard" className="dash-topbar-brand" aria-label="Mentora dashboard home">
            <img src={mentoraLogo} alt="" aria-hidden="true" className="brand-logo-img" />
            <span>Mentora</span>
          </Link>

          <form
            className="dash-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim()) navigate(`/dashboard/tutors?q=${encodeURIComponent(search.trim())}`);
            }}
          >
            <SearchIcon />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for tutors, skills or subjects..."
              aria-label="Search"
            />
          </form>

          <ThemeToggle />

          <Link to="/dashboard/notifications" className="dash-bell" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}>
            <BellIcon />
            {unreadCount > 0 && <span className="dash-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </Link>

          <Link to="/dashboard/settings" className="dash-topbar-profile" aria-label="Open parent account settings">
            {user ? <Avatar name={user.name} photoUrl={user.photoUrl} className="dash-topbar-avatar" /> : <span className="initials-avatar dash-topbar-avatar">...</span>}
            <span className="dash-topbar-profile-copy">
              <strong>{user?.name ?? 'Parent account'}</strong>
              <span>Parent</span>
            </span>
            <ChevronDownIcon />
          </Link>
        </header>

        <div className="dash-content">{children}</div>
      </div>
      {referralOpen && <ReferralModal onClose={() => setReferralOpen(false)} />}
    </div>
  );
}

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="dash-coming-soon">
      <h2>{title}</h2>
      <p>This section is coming soon.</p>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: 'Find a Tutor', icon: SearchIcon, tone: 'blue', to: '/dashboard/tutors' },
  { label: 'Saved Tutors', icon: BookmarkIcon, tone: 'green', to: '/dashboard/saved' },
  { label: 'Book a Session', icon: CalendarIcon, tone: 'orange', to: '/dashboard/bookings' },
  { label: 'Message Tutors', icon: ChatIcon, tone: 'purple', to: '/dashboard/messages' },
  { label: 'View Bookings', icon: CalendarIcon, tone: 'blue', to: '/dashboard/bookings' },
];

const SUBJECT_CATEGORIES = [
  { label: 'AI & Machine Learning', icon: RobotIcon },
  { label: 'Coding & Programming', icon: CodeIcon },
  { label: 'Data Science & Analytics', icon: ChartIcon },
  { label: 'Public Speaking', icon: MicIcon },
  { label: 'Math & Sciences', icon: MathIcon },
  { label: 'Business & Entrepreneurship', icon: BriefcaseIcon },
  { label: 'Product Management', icon: BriefcaseIcon },
  { label: 'Prompt Engineering', icon: RobotIcon },
  { label: 'AI Fluency', icon: LightbulbIcon },
];

const MAX_STUDENT_AVATARS = 4;

function isUpcomingBooking(booking: Booking): boolean {
  return new Date(booking.date).getTime() >= new Date().setHours(0, 0, 0, 0) && booking.status === 'CONFIRMED';
}

export function DashboardHomePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [tutors, setTutors] = useState<PublicTutorDto[] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    apiRequest<{ students: Student[] }>('/api/students').then((res) => setStudents(res.data?.students ?? [])).catch(() => setStudents([]));
    apiRequest<{ bookings: Booking[] }>('/api/bookings').then((res) => setBookings(res.data?.bookings ?? [])).catch(() => setBookings([]));
    apiRequest<{ tutors: PublicTutorDto[] }>('/api/tutors').then((res) => setTutors((res.data?.tutors ?? []).slice(0, 4))).catch(() => setTutors([]));
    apiRequest<{ saved: SavedTutor[] }>('/api/saved-tutors').then((res) => setSavedIds(new Set((res.data?.saved ?? []).map((item) => item.tutorId)))).catch(() => {});
  }, []);

  function toggleSaved(tutorId: string) {
    const wasSaved = savedIds.has(tutorId);
    setSavedIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(tutorId); else next.add(tutorId);
      return next;
    });
    const request = wasSaved
      ? apiRequest(`/api/saved-tutors/${tutorId}`, { method: 'DELETE' })
      : apiRequest('/api/saved-tutors', { method: 'POST', body: JSON.stringify({ tutorId }) });
    request.catch(() => setSavedIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.add(tutorId); else next.delete(tutorId);
      return next;
    }));
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const primaryStudent = students && students.length > 0 ? students[0] : null;
  const studentFirstName = primaryStudent?.fullName.split(' ')[0] ?? 'your student';
  const visibleStudents = students?.slice(0, MAX_STUDENT_AVATARS) ?? [];
  const overflowCount = students ? students.length - visibleStudents.length : 0;

  const nextBooking = (bookings ?? [])
    .filter(isUpcomingBooking)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0] ?? null;

  return (
    <>
      <section className="dash-welcome">
        {user && (
          <div className="dash-welcome-visual">
            <Link to="/dashboard/settings" className="dash-student-photo" aria-label="Open parent profile and settings">
              <Avatar name={user.name} photoUrl={user.photoUrl} className="dash-hero-avatar" />
            </Link>

            {primaryStudent && (
              <div className="dash-students-row" aria-label="Students connected to this parent">
                {visibleStudents.map((student) => (
                  <Link
                    key={student.id}
                    to={`/dashboard/students#${student.id}`}
                    className="dash-students-row-item"
                    title={student.fullName}
                    aria-label={`View ${student.fullName.split(' ')[0]}'s profile`}
                  >
                    <Avatar name={student.fullName} photoUrl={student.photoUrl} className="dash-students-row-avatar" />
                  </Link>
                ))}
                {overflowCount > 0 && (
                  <Link to="/dashboard/students" className="dash-students-row-item dash-students-row-more" aria-label={`View all ${students?.length} students`}>
                    +{overflowCount}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        <div className="dash-welcome-copy">
          <h1>Welcome{students && students.length > 0 ? ' back' : ''}, {firstName}!</h1>
          <p>{students === null ? 'Loading your family learning overview.' : primaryStudent ? 'Manage your students and find the right tutors to help them excel.' : 'Add your first student to get personalized tutor recommendations and start their learning journey.'}</p>
          {students !== null && <div className="dash-welcome-actions"><Link to="/onboarding/add-student" className="btn btn-primary">Add a Student</Link><Link to="/dashboard/students" className="btn btn-secondary">View Students</Link><Link to="/dashboard/tutors" className="btn btn-secondary">Find a Tutor</Link></div>}
        </div>

      </section>

      <section className="dash-quick-actions">
        <h2>What would you like to do today?</h2>
        <div className="dash-quick-actions-grid">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} to={action.to} className="dash-quick-action">
                <span className={`dash-quick-action-icon tone-${action.tone}`}><Icon /></span>
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="dash-section">
        <div className="dash-section-heading">
          <h2>Recommended Tutors{primaryStudent ? ` for ${studentFirstName}` : ''}</h2>
          <Link to="/dashboard/tutors">View all tutors <span aria-hidden="true">→</span></Link>
        </div>
        {tutors === null ? null : tutors.length > 0 ? <div className="dash-tutor-row">
          {tutors.map((tutor) => (
            <article key={tutor.id} className="dash-tutor-card">
              <div className="dash-tutor-photo">
                <Avatar name={tutor.name} photoUrl={tutor.photoUrl} className="dash-tutor-avatar" />
                <button type="button" className={savedIds.has(tutor.id) ? 'dash-tutor-favorite active' : 'dash-tutor-favorite'} aria-label={savedIds.has(tutor.id) ? `Remove ${tutor.name} from saved tutors` : `Save ${tutor.name}`} aria-pressed={savedIds.has(tutor.id)} onClick={() => toggleSaved(tutor.id)}>
                  <StarIcon />
                </button>
              </div>
              <h3>{tutor.name} <CheckIcon className="dash-verified-icon" /></h3>
              <p className="dash-tutor-subject">{tutor.professionalTitle ?? 'Tutor'}</p>
              <div className="dash-tutor-meta">
                <StarIcon className="dash-tutor-rating-icon" />
                <span>{tutor.reviewCount ? tutor.rating : 'New'}</span>
                <span className="dash-tutor-reviews">({tutor.reviewCount})</span>
                {tutor.yearsExperience && <span className="dash-tutor-years">{tutor.yearsExperience}</span>}
              </div>
              <span className={tutor.availabilityDays.length ? 'dash-status-pill online' : 'dash-status-pill busy'}>{tutor.availabilityDays.length ? 'Available' : 'Schedule pending'}</span>
              <p className="dash-tutor-price">{tutor.sessionPrice ? `From ₦${tutor.sessionPrice.toLocaleString()} / session` : 'Price not set'}</p>
              <Link to={`/dashboard/tutors/${tutor.id}`} className="btn btn-secondary full">View Profile</Link>
            </article>
          ))}
        </div> : <div className="mystudents-empty"><p>No verified tutors are available yet.</p><Link to="/dashboard/tutors" className="btn btn-secondary">Browse tutors</Link></div>}
      </section>

      <section className="dash-section">
        <div className="dash-section-heading">
          <h2>Popular Subjects</h2>
          <Link to="/dashboard/tutors">View all subjects <span aria-hidden="true">→</span></Link>
        </div>
        <div className="dash-subject-grid">
          {SUBJECT_CATEGORIES.map((subject) => {
            const Icon = subject.icon;
            return (
              <Link key={subject.label} to="/dashboard/tutors" className="dash-subject-card">
                <span className="dash-subject-icon"><Icon /></span>
                <span>{subject.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="dash-bottom-row">
        <div className="dash-card">
          <div className="dash-section-heading">
            <h2>Upcoming Booking</h2>
            <Link to="/dashboard/bookings">View all <span aria-hidden="true">→</span></Link>
          </div>
          {bookings === null ? null : nextBooking ? (
            <div className="dash-booking-row">
              <Avatar name={nextBooking.tutorName} photoUrl={nextBooking.tutorPhotoUrl} className="dash-booking-avatar" />
              <div className="dash-booking-info">
                <strong>{nextBooking.subject}</strong>
                <span>{nextBooking.tutorName} <CheckIcon className="dash-verified-icon" /></span>
                <span className="dash-booking-time"><CalendarIcon /> {formatBookingDate(new Date(nextBooking.date))} · {nextBooking.startTime} – {nextBooking.endTime}</span>
                <span className="dash-booking-platform">
                  {nextBooking.format === 'RECORDED' ? <><PinIcon /> Recorded</> : <><VideoIcon /> Online</>}
                </span>
              </div>
              <Link to="/dashboard/bookings" className="btn btn-secondary">View Booking</Link>
            </div>
          ) : (
            <div className="mystudents-empty">
              <p>No upcoming sessions yet.</p>
              <Link to="/dashboard/tutors" className="btn btn-primary">Find a Tutor <span aria-hidden="true">→</span></Link>
            </div>
          )}
        </div>

        <div className="dash-card dash-tips-card">
          <h2>Learning Tips</h2>
          <div className="dash-tip">
            <span className="dash-tip-icon"><LightbulbIcon /></span>
            <div>
              <strong>Consistency is key!</strong>
              <p>Encourage {studentFirstName} to learn a little each day. Small steps lead to big results.</p>
              <Link to="/help/faq">See more tips <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </div>
      </section>

      {!bannerDismissed && (
        <div className="dash-sticky-banner">
          <span className="dash-sticky-icon"><TrophyIcon /></span>
          <div className="dash-sticky-copy">
            <strong>Unlock {studentFirstName}'s full potential</strong>
            <span>Connect with expert tutors and give {studentFirstName} the edge {studentFirstName === 'your student' ? 'they deserve' : 'they deserve'}.</span>
          </div>
          <Link to="/dashboard/tutors" className="btn btn-primary">Find a Tutor Now <span aria-hidden="true">→</span></Link>
          <button type="button" className="dash-sticky-close" aria-label="Dismiss" onClick={() => setBannerDismissed(true)}>
            <XIcon />
          </button>
        </div>
      )}
    </>
  );
}
