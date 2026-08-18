import { useEffect, useState } from 'react';
import type { AvailabilitySlot } from '@mentora/shared';
import { WEEKDAY_LABELS } from '@mentora/shared';
import { apiRequest, ApiError } from '../lib/api';
import { ClockIcon, TrashIcon, PlusIcon } from '../components/Icons';

export function TutorAvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiRequest<{ slots: AvailabilitySlot[] }>('/api/tutor/availability')
      .then((r) => setSlots(r.data?.slots ?? []))
      .catch(() => setSlots([]));
  }

  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/tutor/availability', {
        method: 'POST',
        body: JSON.stringify({ dayOfWeek: Number(dayOfWeek), startTime, endTime }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this time slot.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    const previous = slots;
    setSlots((prev) => prev?.filter((s) => s.id !== id) ?? prev);
    try {
      await apiRequest(`/api/tutor/availability/${id}`, { method: 'DELETE' });
    } catch {
      setSlots(previous ?? null);
    }
  }

  const byDay = WEEKDAY_LABELS.map((label, day) => ({
    label,
    slots: (slots ?? []).filter((s) => s.dayOfWeek === day),
  }));

  return (
    <div className="tdash-home">
      <div className="pay-header">
        <div>
          <h1>Availability</h1>
          <p className="booking-section-hint">Set the times you're generally available to teach.</p>
        </div>
      </div>

      <section className="dash-card">
        <h2>Add a time slot</h2>
        <form className="tavail-form" onSubmit={handleAdd}>
          <div className="tutor-onb-select-with-icon">
            <ClockIcon />
            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
              {WEEKDAY_LABELS.map((label, i) => <option key={label} value={i}>{label}</option>)}
            </select>
          </div>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="settings-inline-input" />
          <span>to</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="settings-inline-input" />
          <button type="submit" className="btn btn-primary" disabled={submitting}><PlusIcon /> Add</button>
        </form>
        {error && <p className="photo-uploader-error">{error}</p>}
      </section>

      <section className="dash-card">
        <h2>Your weekly schedule</h2>
        {slots === null ? null : slots.length === 0 ? (
          <div className="mystudents-empty"><p>No availability set yet. Add a time slot above so parents know when to book you.</p></div>
        ) : (
          <div className="tavail-week">
            {byDay.map((d) => (
              <div key={d.label} className="tavail-day-row">
                <strong>{d.label}</strong>
                <div className="tavail-day-slots">
                  {d.slots.length === 0 ? (
                    <span className="tavail-day-empty">Not available</span>
                  ) : (
                    d.slots.map((s) => (
                      <span key={s.id} className="tavail-slot-chip">
                        {s.startTime}–{s.endTime}
                        <button type="button" aria-label="Remove slot" onClick={() => handleRemove(s.id)}><TrashIcon /></button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
