import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Notification } from '@mentora/shared';
import { apiRequest } from '../lib/api';
import { useAuth } from './AuthContext';

interface NotificationsContextValue {
  notifications: Notification[] | null;
  unreadCount: number;
  reload: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// Not a websocket, but close enough for a notification bell — picks up anything
// new within a minute, and an immediate refetch on read keeps the badge itself instant.
const POLL_INTERVAL_MS = 45000;

// Only these roles render a notification badge today (Admin's bell is driven by a
// separate action-items summary; Student's has no counter) — no point polling for others.
const ROLES_WITH_BADGE = new Set(['PARENT', 'TUTOR']);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const active = Boolean(user && ROLES_WITH_BADGE.has(user.role));

  const load = useCallback(() => {
    apiRequest<{ notifications: Notification[] }>('/api/notifications')
      .then((res) => setNotifications(res.data?.notifications ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) {
      setNotifications(null);
      return;
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [active, load]);

  async function markRead(id: string) {
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)) ?? prev);
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch {
      load();
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
    <NotificationsContext.Provider value={{ notifications, unreadCount, reload: load, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}
