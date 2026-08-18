import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TutorProfileDto, TutorIdType } from '@mentora/shared';
import { TUTOR_ID_TYPES, TUTOR_ID_TYPE_LABELS, TUTOR_QUALIFICATION_OPTIONS, TUTOR_EXPERIENCE_OPTIONS } from '@mentora/shared';
import { apiRequest, apiUpload, ApiError } from '../lib/api';
import { DocumentUploader } from '../components/DocumentUploader';
import tutorOnboardingIllustration from '../assets/tutor-onboarding.png';
import {
  ShieldCheckIcon,
  IdCardIcon,
  GraduationCapIcon,
  ClipboardIcon,
  SlidersIcon,
  UploadCloudIcon,
  CheckIcon,
  ChevronLeftIcon,
  XIcon,
  HelpCircleIcon,
} from '../components/Icons';

function SectionStatus({ complete }: { complete: boolean }) {
  return complete ? (
    <span className="tutor-onb-section-status done"><CheckIcon /> Completed</span>
  ) : (
    <span className="tutor-onb-section-status" />
  );
}

export function TutorVerificationPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TutorProfileDto | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docsBusy, setDocsBusy] = useState(false);

  const [idType, setIdType] = useState<TutorIdType | ''>('');
  const [qualification, setQualification] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [experienceDescription, setExperienceDescription] = useState('');
  const [declarationAccurate, setDeclarationAccurate] = useState(false);
  const [declarationMisinfo, setDeclarationMisinfo] = useState(false);
  const [declarationConsent, setDeclarationConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const identityRef = useRef<HTMLDivElement>(null);
  const educationRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const declarationRef = useRef<HTMLDivElement>(null);
  const sectionRefs: Record<string, RefObject<HTMLDivElement>> = {
    identity: identityRef,
    education: educationRef,
    experience: experienceRef,
    declaration: declarationRef,
  };

  const supportingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiRequest<{ profile: TutorProfileDto }>('/api/tutor-profile/me')
      .then((res) => {
        const p = res.data?.profile;
        if (!p) return;
        if (p.verificationStatus !== 'NOT_SUBMITTED') {
          navigate('/tutor');
          return;
        }
        if (!p.profileCompletedAt) {
          navigate('/onboarding/tutor-profile');
          return;
        }
        setProfile(p);
        setIdType((p.idType as TutorIdType) ?? '');
        setQualification(p.qualification ?? '');
        setInstitutionName(p.institutionName ?? '');
        setYearsExperience(p.yearsExperience ?? '');
        setExperienceDescription(p.experienceDescription ?? '');
        setDeclarationAccurate(p.declarationAccurate);
        setDeclarationMisinfo(p.declarationMisinfo);
        setDeclarationConsent(p.declarationConsent);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [navigate]);

  async function persist(patch: Record<string, unknown>) {
    try {
      const res = await apiRequest<{ profile: TutorProfileDto }>('/api/tutor-profile/me', { method: 'PATCH', body: JSON.stringify(patch) });
      if (res.data?.profile) setProfile(res.data.profile);
    } catch {
      // best-effort; local state still reflects the intended value
    }
  }

  async function handleSupportingUpload(file: File) {
    setDocsBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'supportingDoc');
      const res = await apiUpload<{ profile: TutorProfileDto }>('/api/tutor-profile/me/documents', formData);
      if (res.data?.profile) setProfile(res.data.profile);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload document. Please try again.');
    } finally {
      setDocsBusy(false);
    }
  }

  async function removeSupportingDoc(url: string) {
    setDocsBusy(true);
    try {
      const res = await apiRequest<{ profile: TutorProfileDto }>(`/api/tutor-profile/me/documents/supportingDoc?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
      if (res.data?.profile) setProfile(res.data.profile);
    } catch {
      // best-effort
    } finally {
      setDocsBusy(false);
    }
  }

  async function handleSubmit() {
    setError(null);

    const errors: Record<string, string> = {};
    if (!idType) errors.idType = 'Please select an ID type.';
    if (!profile?.idFrontUrl) errors.idFrontUrl = 'Please upload the front of your ID.';
    if (!qualification) errors.qualification = 'Please select your highest qualification.';
    if (institutionName.trim().length === 0) errors.institutionName = 'Please enter your institution name.';
    if (!profile?.certificateUrl) errors.certificateUrl = 'Please upload your certificate / diploma.';
    if (!yearsExperience) errors.yearsExperience = 'Please select your years of experience.';
    if (experienceDescription.trim().length === 0) errors.experienceDescription = 'Please describe your teaching experience.';
    if (!declarationAccurate) errors.declarationAccurate = 'Please confirm this statement.';
    if (!declarationMisinfo) errors.declarationMisinfo = 'Please confirm this statement.';
    if (!declarationConsent) errors.declarationConsent = 'Please confirm this statement.';
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Please complete all required sections highlighted below before submitting.');
      const sections: [string, boolean][] = [
        ['identity', Boolean(errors.idType || errors.idFrontUrl)],
        ['education', Boolean(errors.qualification || errors.institutionName || errors.certificateUrl)],
        ['experience', Boolean(errors.yearsExperience || errors.experienceDescription)],
        ['declaration', Boolean(errors.declarationAccurate || errors.declarationMisinfo || errors.declarationConsent)],
      ];
      const first = sections.find(([, hasError]) => hasError);
      if (first) sectionRefs[first[0]].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setSubmitting(true);
    try {
      await persist({
        idType: idType || undefined,
        qualification: qualification || undefined,
        institutionName: institutionName.trim() || undefined,
        yearsExperience: yearsExperience || undefined,
        experienceDescription: experienceDescription.trim() || undefined,
        declarationAccurate,
        declarationMisinfo,
        declarationConsent,
      });
      await apiRequest('/api/tutor-profile/me/submit', { method: 'POST' });
      navigate('/tutor');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit for verification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const identityComplete = Boolean(idType && profile?.idFrontUrl);
  const educationComplete = Boolean(qualification && institutionName.trim() && profile?.certificateUrl);
  const experienceComplete = Boolean(yearsExperience && experienceDescription.trim());
  const declarationComplete = declarationAccurate && declarationMisinfo && declarationConsent;

  if (!loaded) return <div className="tutor-onb-page" />;

  return (
    <div className="tutor-onb-page">
      <header className="tutor-onb-topbar">
        <div className="dash-brand"><span>Mentora</span></div>
        <div className="tutor-onb-stepper">
          <span className="tutor-onb-step done"><CheckIcon /> Email verified</span>
          <span className="tutor-onb-step-line" />
          <span className="tutor-onb-step done"><CheckIcon /> Profile completed</span>
          <span className="tutor-onb-step-line" />
          <span className="tutor-onb-step active"><span className="tutor-onb-step-num">3</span> Verification</span>
          <span className="tutor-onb-step-line" />
          <span className="tutor-onb-step upcoming"><span className="tutor-onb-step-num">4</span> Dashboard</span>
        </div>
      </header>

      <div className="tutor-onb-layout">
        <aside className="tutor-onb-sidebar">
          <span className="tutor-onb-badge">You're almost there!</span>
          <h1>Help students learn with confidence.</h1>
          <p>We take verification seriously to ensure parents and students can trust every tutor on Mentora.</p>

          <div className="tutor-onb-tip">
            <ShieldCheckIcon />
            <div>
              <strong>Why we verify tutors</strong>
              <ul>
                <li>Build trust in the community</li>
                <li>Ensure quality and safety</li>
                <li>Highlight your expertise</li>
                <li>Unlock more teaching opportunities</li>
              </ul>
            </div>
          </div>

          <img src={tutorOnboardingIllustration} alt="" aria-hidden="true" className="tutor-onb-illustration" />

          <div className="tutor-onb-progress-card">
            <strong>Verification tips</strong>
            <ul className="tutor-onb-tips-list">
              <li>Use clear, high-quality images or PDFs.</li>
              <li>Make sure all information is legible and up-to-date.</li>
              <li>Verification usually takes 1-3 business days.</li>
            </ul>
          </div>

          <div className="tutor-onb-help-card">
            <HelpCircleIcon />
            <div>
              <strong>Need help?</strong>
              <span>Our support team is here for you.</span>
            </div>
          </div>
        </aside>

        <div className="tutor-onb-main">
          <div className="tutor-onb-verify-head">
            <ShieldCheckIcon />
            <div>
              <h2>Tutor Verification</h2>
              <p className="booking-section-hint">Complete all sections below to get verified and start teaching.</p>
            </div>
          </div>

          <section className="dash-card" ref={identityRef}>
            <div className="tutor-onb-section-head">
              <h3><span className="tutor-onb-section-num">1</span> Identity verification</h3>
              <SectionStatus complete={identityComplete} />
            </div>
            <p className="booking-section-hint">Let's confirm your identity.</p>
            <div className="tutor-onb-grid-2">
              <div className={`tutor-onb-field ${fieldErrors.idType ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">ID type <span className="req" aria-hidden="true">*</span></label>
                <div className="tutor-onb-select-with-icon">
                  <IdCardIcon />
                  <select value={idType} onChange={(e) => { const v = e.target.value as TutorIdType; setIdType(v); persist({ idType: v }); }} aria-invalid={Boolean(fieldErrors.idType)}>
                    <option value="">Select ID type</option>
                    {TUTOR_ID_TYPES.map((t) => <option key={t} value={t}>{TUTOR_ID_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                {fieldErrors.idType && <span className="tutor-onb-error-text" role="alert">{fieldErrors.idType}</span>}
              </div>
              <div className="tutor-onb-field">
                <label className="tutor-onb-label">Upload ID <span className="req" aria-hidden="true">*</span></label>
                <div className="tutor-onb-id-slots">
                  <DocumentUploader kind="idFront" label="Front" hint="JPG, PNG or PDF" fileUrl={profile?.idFrontUrl ?? null} onChange={setProfile} invalid={Boolean(fieldErrors.idFrontUrl)} invalidMessage={fieldErrors.idFrontUrl} required />
                  <DocumentUploader kind="idBack" label="Back" hint="JPG, PNG or PDF" fileUrl={profile?.idBackUrl ?? null} onChange={setProfile} />
                </div>
              </div>
            </div>
          </section>

          <section className="dash-card" ref={educationRef}>
            <div className="tutor-onb-section-head">
              <h3><span className="tutor-onb-section-num">2</span> Education / Qualification</h3>
              <SectionStatus complete={educationComplete} />
            </div>
            <p className="booking-section-hint">Tell us about your highest qualification.</p>
            <div className="tutor-onb-grid-2">
              <div className={`tutor-onb-field ${fieldErrors.qualification ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">Highest qualification <span className="req" aria-hidden="true">*</span></label>
                <div className="tutor-onb-select-with-icon">
                  <GraduationCapIcon />
                  <select value={qualification} onChange={(e) => { setQualification(e.target.value); persist({ qualification: e.target.value }); }} aria-invalid={Boolean(fieldErrors.qualification)}>
                    <option value="">Select qualification</option>
                    {TUTOR_QUALIFICATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {fieldErrors.qualification && <span className="tutor-onb-error-text" role="alert">{fieldErrors.qualification}</span>}
              </div>
              <div className={`tutor-onb-field ${fieldErrors.institutionName ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">Institution name <span className="req" aria-hidden="true">*</span></label>
                <input type="text" placeholder="Enter institution name" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} onBlur={() => persist({ institutionName: institutionName.trim() || undefined })} maxLength={160} aria-invalid={Boolean(fieldErrors.institutionName)} />
                {fieldErrors.institutionName && <span className="tutor-onb-error-text" role="alert">{fieldErrors.institutionName}</span>}
              </div>
            </div>
            <DocumentUploader kind="certificate" label="Upload certificate / diploma" hint="JPG, PNG or PDF (Max. 5MB)" fileUrl={profile?.certificateUrl ?? null} onChange={setProfile} invalid={Boolean(fieldErrors.certificateUrl)} invalidMessage={fieldErrors.certificateUrl} required />
          </section>

          <section className="dash-card" ref={experienceRef}>
            <div className="tutor-onb-section-head">
              <h3><span className="tutor-onb-section-num">3</span> Experience &amp; Supporting evidence</h3>
              <SectionStatus complete={experienceComplete} />
            </div>
            <p className="booking-section-hint">Share evidence of your teaching experience.</p>
            <div className="tutor-onb-grid-2">
              <div className={`tutor-onb-field ${fieldErrors.yearsExperience ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">Years of experience <span className="req" aria-hidden="true">*</span></label>
                <div className="tutor-onb-select-with-icon">
                  <SlidersIcon />
                  <select value={yearsExperience} onChange={(e) => { setYearsExperience(e.target.value); persist({ yearsExperience: e.target.value }); }} aria-invalid={Boolean(fieldErrors.yearsExperience)}>
                    <option value="">Select years of experience</option>
                    {TUTOR_EXPERIENCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {fieldErrors.yearsExperience && <span className="tutor-onb-error-text" role="alert">{fieldErrors.yearsExperience}</span>}
              </div>
              <div className="tutor-onb-field">
                <label className="tutor-onb-label">Upload supporting evidence (Optional)</label>
                <button type="button" className="tutor-upload-box compact" onClick={() => !docsBusy && supportingInputRef.current?.click()} disabled={docsBusy}>
                  <input
                    ref={supportingInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void handleSupportingUpload(file);
                    }}
                  />
                  <UploadCloudIcon />
                  <strong>{docsBusy ? 'Uploading…' : 'Upload documents (e.g. recommendation letter, appointment letter, portfolio)'}</strong>
                  <span>JPG, PNG or PDF (Max. 5MB each)</span>
                </button>
                {profile && profile.supportingDocUrls.length > 0 && (
                  <div className="tutor-onb-doc-chips">
                    {profile.supportingDocUrls.map((url, i) => (
                      <span key={url} className="tutor-onb-chip">
                        Document {i + 1}
                        <button type="button" aria-label="Remove document" onClick={() => removeSupportingDoc(url)}><XIcon /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={`tutor-onb-field ${fieldErrors.experienceDescription ? 'tutor-onb-field-invalid' : ''}`}>
              <label className="tutor-onb-label">Tell us about your teaching experience <span className="req" aria-hidden="true">*</span></label>
              <textarea
                placeholder="Describe your teaching experience, subjects you've taught, and achievements..."
                value={experienceDescription}
                onChange={(e) => setExperienceDescription(e.target.value.slice(0, 500))}
                onBlur={() => persist({ experienceDescription: experienceDescription.trim() || undefined })}
                rows={4}
                aria-invalid={Boolean(fieldErrors.experienceDescription)}
              />
              {fieldErrors.experienceDescription && <span className="tutor-onb-error-text" role="alert">{fieldErrors.experienceDescription}</span>}
              <span className="tutor-onb-char-count">{experienceDescription.length}/500</span>
            </div>
          </section>

          <section className="dash-card" ref={declarationRef}>
            <div className="tutor-onb-section-head">
              <h3><span className="tutor-onb-section-num">4</span> Declaration &amp; Consent</h3>
              <SectionStatus complete={declarationComplete} />
            </div>
            <p className="booking-section-hint">Please read and agree to the statements below.</p>
            <label className={`tutor-onb-checkbox-row ${fieldErrors.declarationAccurate ? 'tutor-onb-checkbox-invalid' : ''}`}>
              <input type="checkbox" checked={declarationAccurate} onChange={(e) => { setDeclarationAccurate(e.target.checked); persist({ declarationAccurate: e.target.checked }); }} />
              <span>I confirm that the information provided above is true and accurate. <span className="req" aria-hidden="true">*</span></span>
            </label>
            {fieldErrors.declarationAccurate && <span className="tutor-onb-error-text" role="alert">{fieldErrors.declarationAccurate}</span>}
            <label className={`tutor-onb-checkbox-row ${fieldErrors.declarationMisinfo ? 'tutor-onb-checkbox-invalid' : ''}`}>
              <input type="checkbox" checked={declarationMisinfo} onChange={(e) => { setDeclarationMisinfo(e.target.checked); persist({ declarationMisinfo: e.target.checked }); }} />
              <span>I understand that any false information may result in rejection or removal from Mentora. <span className="req" aria-hidden="true">*</span></span>
            </label>
            {fieldErrors.declarationMisinfo && <span className="tutor-onb-error-text" role="alert">{fieldErrors.declarationMisinfo}</span>}
            <label className={`tutor-onb-checkbox-row ${fieldErrors.declarationConsent ? 'tutor-onb-checkbox-invalid' : ''}`}>
              <input type="checkbox" checked={declarationConsent} onChange={(e) => { setDeclarationConsent(e.target.checked); persist({ declarationConsent: e.target.checked }); }} />
              <span>I consent to Mentora verifying my information and using it to maintain platform safety and quality. <span className="req" aria-hidden="true">*</span></span>
            </label>
            {fieldErrors.declarationConsent && <span className="tutor-onb-error-text" role="alert">{fieldErrors.declarationConsent}</span>}
            <div className="tutor-onb-tip compact">
              <ShieldCheckIcon />
              <div>
                <strong>Your information is secure</strong>
                <span>All documents and data are encrypted and used only for verification purposes.</span>
              </div>
            </div>
          </section>

          <div className="tutor-onb-next-box">
            <ClipboardIcon />
            <div>
              <strong>What happens next?</strong>
              <span>Once submitted, our team will review your information. You'll get an email within 1-3 business days.</span>
            </div>
          </div>

          {error && <p className="photo-uploader-error">{error}</p>}

          <div className="tutor-onb-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/onboarding/tutor-profile')}>
              <ChevronLeftIcon /> Back to profile
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting && <span className="spinner" aria-hidden="true" />}
              {submitting ? 'Submitting…' : 'Submit for verification'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
