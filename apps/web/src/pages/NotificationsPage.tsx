import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Notification } from '@mentora/shared';
import { apiRequest } from '../lib/api';
import { BellIcon, CheckIcon, ChevronLeftIcon } from '../components/Icons';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  useEffect(() => {
    apiRequest<{ notifications: Notification[] }>('/api/notifications')
      .then((res) => setNotifications(res.data?.notifications ?? []))
      .catch(() => setNotifications([]));
  }, []);

  async function markRead(id: string) {
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)) ?? prev);
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch {
      // best-effort; local state already reflects the read action
    }
  }

  async function markAllRead() {
    const previous = notifications;
    setNotifications((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? prev);
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
    } catch {
      setNotifications(previous ?? null);
    }
  }

  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="notif-page">
      <div className="notif-header">
        <Link to="/dashboard" className="tprofile-back"><ChevronLeftIcon /> Back to dashboard</Link>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-secondary" onClick={markAllRead}>Mark all as read</button>
        )}
      </div>

      <h1>Notifications</h1>

      {notifications === null ? null : notifications.length === 0 ? (
        <div className="notif-empty">
          <span className="notif-empty-icon"><BellIcon /></span>
          <h2>No new notifications</h2>
          <p>You're all caught up. We'll let you know here when something needs your attention.</p>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map((n) => (
            <div key={n.id} className={n.readAt ? 'notif-item' : 'notif-item unread'}>
              <span className="notif-dot" aria-hidden="true" />
              <div className="notif-item-body">
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                <span className="notif-time">{formatRelativeTime(n.createdAt)}</span>
              </div>
              {!n.readAt && (
                <button type="button" className="notif-read-btn" onClick={() => markRead(n.id)} aria-label="Mark as read">
                  <CheckIcon /> Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
