export function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return <span className={`initials-avatar ${className ?? ''}`}>{initials || '?'}</span>;
}

export function Avatar({ name, photoUrl, className }: { name: string; photoUrl?: string | null; className?: string }) {
  if (photoUrl) return <img src={photoUrl} alt="" aria-hidden="true" className={`avatar-photo ${className ?? ''}`} />;
  return <InitialsAvatar name={name} className={className} />;
}
