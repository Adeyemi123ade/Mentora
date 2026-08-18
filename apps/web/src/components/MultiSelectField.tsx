import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDownIcon, XIcon } from './Icons';

export function MultiSelectField({
  label,
  icon,
  options,
  selected,
  onChange,
  placeholder,
  hint,
  required,
  error,
}: {
  label: string;
  icon: ReactNode;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  hint?: string;
  required?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  }

  return (
    <div className={`tutor-onb-field ${error ? 'tutor-onb-field-invalid' : ''}`}>
      <label className="tutor-onb-label">{label}{required && <span className="req" aria-hidden="true">*</span>}</label>
      {hint && <p className="booking-section-hint">{hint}</p>}
      <div className="tutor-onb-multiselect" ref={ref}>
        <button type="button" className="tutor-onb-select-trigger" onClick={() => setOpen((v) => !v)} aria-invalid={Boolean(error)}>
          {icon}
          <span>{selected.length > 0 ? `${selected.length} selected` : placeholder}</span>
          <ChevronDownIcon />
        </button>
        {open && (
          <div className="tutor-onb-select-menu" role="listbox">
            {options.map((opt) => (
              <label key={opt} className="tutor-onb-select-option">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
                {opt}
              </label>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="tutor-onb-chips">
          {selected.map((s) => (
            <span key={s} className="tutor-onb-chip">
              {s}
              <button type="button" aria-label={`Remove ${s}`} onClick={() => toggle(s)}>
                <XIcon />
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <span className="tutor-onb-error-text" role="alert">{error}</span>}
    </div>
  );
}
