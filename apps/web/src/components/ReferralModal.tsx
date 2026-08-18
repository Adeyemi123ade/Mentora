import { useState } from 'react';
import { Modal } from './Modal';

export function ReferralModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/?ref=mentora-share`;
  const message = `I'm using Mentora to find and manage tutoring for students. You can check it out here: ${url}`;
  async function copy() {
    try { await navigator.clipboard.writeText(url); }
    catch { const area = document.createElement('textarea'); area.value = url; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); }
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }
  async function nativeShare() { if (navigator.share) await navigator.share({ title: 'Mentora', text: message, url }).catch(() => {}); }
  return <Modal title="Invite Friends" onClose={onClose}><p>Share Mentora with parents and learners. Monetary rewards are not currently available.</p><div className="referral-link"><span>{url}</span><button type="button" className="btn btn-secondary" onClick={copy}>{copied ? 'Copied' : 'Copy Link'}</button></div><div className="referral-actions"><a className="btn btn-primary" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">WhatsApp</a><a className="btn btn-secondary" href={`mailto:?subject=${encodeURIComponent('Try Mentora')}&body=${encodeURIComponent(message)}`}>Email</a>{typeof navigator.share === 'function' && <button type="button" className="btn btn-secondary" onClick={nativeShare}>Share</button>}</div></Modal>;
}
