import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { apiRequest, apiUpload, ApiError } from '../lib/api';
import { Avatar } from './Avatar';
import { EditIcon } from './Icons';

type PhotoUploaderProps = {
  name: string;
  photoUrl: string | null;
  uploadUrl: string;
  deleteUrl: string;
  onChange: (photoUrl: string | null) => void;
  avatarClassName?: string;
};

export function PhotoUploader({ name, photoUrl, uploadUrl, deleteUrl, onChange, avatarClassName }: PhotoUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await apiUpload<{ user?: { photoUrl: string | null }; student?: { photoUrl: string | null } }>(uploadUrl, formData);
      const newUrl = res.data?.user?.photoUrl ?? res.data?.student?.photoUrl ?? null;
      onChange(newUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload photo. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setMenuOpen(false);
    setError(null);
    setBusy(true);
    try {
      await apiRequest(deleteUrl, { method: 'DELETE' });
      onChange(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove photo. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photo-uploader">
      <div className="photo-uploader-avatar-wrap" ref={wrapRef}>
        <Avatar name={name} photoUrl={photoUrl} className={avatarClassName ?? 'photo-uploader-avatar'} />

        {photoUrl ? (
          <>
            <button
              type="button"
              className="photo-uploader-edit-btn"
              aria-label="Change profile photo"
              disabled={busy}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <EditIcon />
            </button>
            {menuOpen && (
              <div className="photo-uploader-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); inputRef.current?.click(); }}>
                  Replace Image
                </button>
                <button type="button" role="menuitem" className="photo-uploader-menu-danger" onClick={handleDelete}>
                  Remove Image
                </button>
              </div>
            )}
          </>
        ) : (
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? 'Uploading…' : 'Upload Photo'}
          </button>
        )}

        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </div>
      {error && <p className="photo-uploader-error">{error}</p>}
    </div>
  );
}
