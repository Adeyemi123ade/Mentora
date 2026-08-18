import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProfileStrength, TutorProfileDto } from '@mentora/shared';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { BookIcon, CalendarIcon, CheckIcon, ClockIcon, EditIcon, EyeIcon, GlobeIcon, GraduationCapIcon, PinIcon, ShareIcon, UsersIcon, VideoIcon, WalletIcon } from '../components/Icons';

const formatLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function TutorProfileOverviewPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TutorProfileDto | null>(null);
  const [strength, setStrength] = useState<ProfileStrength | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiRequest<{ profile: TutorProfileDto }>('/api/tutor-profile/me').then((r) => setProfile(r.data?.profile ?? null)).catch(() => {});
    apiRequest<{ strength: ProfileStrength }>('/api/tutor/dashboard/profile-strength').then((r) => setStrength(r.data?.strength ?? null)).catch(() => {});
  }, []);

  const location = [profile?.city, profile?.country].filter(Boolean).join(', ');
  const memberSince = useMemo(() => user?.createdAt ? new Date(user.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' }) : 'Recently', [user?.createdAt]);

  async function shareProfile() {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: `${user?.name ?? 'Tutor'} on Mentora`, url }).catch(() => {});
    else await navigator.clipboard.writeText(url).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  }

  return (
    <div className="tutor-profile-overview">
      <header className="tutor-page-heading">
        <div><h1>My Profile</h1><p>Manage your public profile and personal information.</p></div>
        <button className="btn btn-secondary" type="button" onClick={shareProfile}><EyeIcon /> Preview public profile</button>
      </header>

      <div className="tutor-profile-grid">
        <div className="tutor-profile-main">
          <section className="dash-card tutor-profile-hero">
            <Avatar name={user?.name ?? ''} photoUrl={profile?.photoUrl ?? user?.photoUrl} className="tutor-profile-photo" />
            <div className="tutor-profile-identity"><h2>{user?.name}</h2><span className={`tdash-verify-chip ${profile?.verificationStatus.toLowerCase()}`}>{formatLabel(profile?.verificationStatus ?? 'not submitted')}</span><p>{profile?.professionalTitle ?? 'Tutor'}</p>{location && <small><PinIcon /> {location}</small>}<small><CalendarIcon /> Member since {memberSince}</small></div>
            <div className="tutor-profile-actions"><Link to="/tutor/profile/edit" className="btn btn-secondary"><EditIcon /> Edit profile</Link><button type="button" className="btn btn-primary" onClick={shareProfile}><ShareIcon /> {copied ? 'Link copied' : 'Share profile'}</button></div>
          </section>

          <div className="tutor-profile-cards">
            <section className="dash-card"><div className="card-title-row"><h2>About me</h2><Link to="/tutor/profile/edit"><EditIcon /></Link></div><p className="profile-copy">{profile?.bio || 'Add a short introduction to help students get to know you.'}</p></section>
            <section className="dash-card"><div className="card-title-row"><h2>Subjects &amp; Expertise</h2><Link to="/tutor/profile/edit"><EditIcon /></Link></div><div className="profile-chip-list">{profile?.subjects.map((subject) => <span key={subject}>{subject} <CheckIcon /></span>)}</div></section>
            <section className="dash-card"><div className="card-title-row"><h2>Teaching experience</h2><Link to="/tutor/profile/edit"><EditIcon /></Link></div><strong className="profile-highlight">{profile?.yearsExperience ?? 'Not added'}</strong><p className="profile-copy">{profile?.experienceDescription || 'Add your teaching background and experience.'}</p></section>
            <section className="dash-card"><div className="card-title-row"><h2>Education</h2><Link to="/tutor/profile/edit"><EditIcon /></Link></div><div className="profile-detail-row"><GraduationCapIcon /><div><strong>{profile?.qualification ?? 'Not added'}</strong><span>{profile?.institutionName ?? 'Add your institution'}</span></div></div></section>
            <section className="dash-card"><div className="card-title-row"><h2>Teaching details</h2><Link to="/tutor/profile/edit"><EditIcon /></Link></div><div className="profile-details-grid"><div><VideoIcon /><span><small>Teaching format</small>{profile?.teachingFormats.map(formatLabel).join(' & ') || 'Not set'}</span></div><div><UsersIcon /><span><small>Student levels</small>{profile?.gradeLevels.join(', ') || 'Not set'}</span></div><div><GlobeIcon /><span><small>Languages</small>{profile?.languages.join(', ') || 'Not set'}</span></div><div><ClockIcon /><span><small>Session duration</small>{profile?.sessionDurationMinutes ? `${profile.sessionDurationMinutes} minutes` : 'Not set'}</span></div></div></section>
            <section className="dash-card"><div className="card-title-row"><h2>Pricing information</h2><Link to="/tutor/profile/edit"><EditIcon /></Link></div><span className="profile-price-label">Hourly rate</span><strong className="profile-price">₦{profile?.sessionPrice?.toLocaleString() ?? '—'} / session</strong><div className="profile-note"><WalletIcon /> You can update your rate at any time.</div></section>
          </div>
        </div>

        <aside className="tutor-profile-aside">
          <section className="dash-card"><h2>Profile completeness</h2><div className="profile-strength"><div className="tdash-strength-donut" style={{ background: `conic-gradient(var(--primary) ${strength?.percent ?? 0}%, var(--line) 0)` }}><span>{strength?.percent ?? 0}%</span></div><div><strong>{strength?.label ?? 'Keep going'}</strong><p>Complete the remaining sections to boost your visibility.</p></div></div><Link to="/tutor/profile/edit" className="link-btn">Complete profile details →</Link></section>
          <section className="dash-card"><h2>Quick actions</h2><nav className="profile-quick-actions"><Link to="/tutor/profile/edit"><EditIcon /> Edit profile <span>›</span></Link><Link to="/tutor/profile/edit"><BookIcon /> Manage subjects <span>›</span></Link><Link to="/tutor/profile/edit"><WalletIcon /> Update rates <span>›</span></Link><button type="button" onClick={shareProfile}><EyeIcon /> Preview public profile <span>›</span></button></nav></section>
        </aside>
      </div>
    </div>
  );
}
