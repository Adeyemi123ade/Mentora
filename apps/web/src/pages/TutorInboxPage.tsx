import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ConversationSummary, MessageDto } from '@mentora/shared';
import { apiRequest } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { SearchIcon, SendIcon, NoteIcon, CheckIcon, ChatIcon } from '../components/Icons';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const diffDays = Math.round((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function TutorInboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[] | null>(null);
  const [search, setSearch] = useState('');
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [students, setStudents] = useState<{ id: string; fullName: string }[]>([]);
  const [noteStudentId, setNoteStudentId] = useState('');
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  function loadConversations() {
    return apiRequest<{ conversations: ConversationSummary[] }>('/api/messages/conversations')
      .then((res) => {
        const list = res.data?.conversations ?? [];
        setConversations(list);
        return list;
      })
      .catch(() => {
        setConversations([]);
        return [];
      });
  }

  useEffect(() => {
    loadConversations().then((list) => {
      const parentParam = searchParams.get('parent');
      if (parentParam) {
        apiRequest<{ conversation: ConversationSummary }>('/api/messages/conversations', {
          method: 'POST',
          body: JSON.stringify({ counterpartId: parentParam }),
        })
          .then((res) => {
            if (res.data?.conversation) {
              setSelectedId(res.data.conversation.id);
              loadConversations();
            }
          })
          .catch(() => {})
          .finally(() => setSearchParams({}, { replace: true }));
      } else if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages(null);
      return;
    }
    setMessages(null);
    apiRequest<{ messages: MessageDto[] }>(`/api/messages/conversations/${selectedId}/messages`)
      .then((res) => {
        setMessages(res.data?.messages ?? []);
        setConversations((prev) => prev?.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)) ?? prev);
      })
      .catch(() => setMessages([]));
    apiRequest<{ students: { id: string; fullName: string }[] }>(`/api/messages/conversations/${selectedId}/students`)
      .then((res) => setStudents(res.data?.students ?? []))
      .catch(() => setStudents([]));
    setNoteStudentId('');
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const selected = conversations?.find((c) => c.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    if (!conversations) return [];
    if (!search.trim()) return conversations;
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => c.counterpart.name.toLowerCase().includes(q));
  }, [conversations, search]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !composerText.trim() || sending) return;
    setSending(true);
    const body = composerText.trim();
    const studentId = noteStudentId || undefined;
    try {
      const res = await apiRequest<{ message: MessageDto }>(`/api/messages/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body, studentId }),
      });
      if (res.data?.message) {
        setMessages((prev) => (prev ? [...prev, res.data!.message] : [res.data!.message]));
        setComposerText('');
        setNoteStudentId('');
        setConversations((prev) =>
          prev
            ? prev
                .map((c) => (c.id === selectedId ? { ...c, lastMessagePreview: body, lastMessageAt: res.data!.message.createdAt } : c))
                .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
            : prev
        );
      }
    } catch {
      // best-effort; composer text preserved for retry
    } finally {
      setSending(false);
    }
  }

  async function startConversationWith(parentId: string) {
    try {
      const res = await apiRequest<{ conversation: ConversationSummary }>('/api/messages/conversations', {
        method: 'POST',
        body: JSON.stringify({ counterpartId: parentId }),
      });
      if (res.data?.conversation) {
        setSelectedId(res.data.conversation.id);
        await loadConversations();
      }
      setNewMessageOpen(false);
    } catch {
      // modal stays open so the tutor can see nothing silently failed
    }
  }

  return (
    <div className="msgs-page">
      <div className="msgs-header">
        <div>
          <h1>Inbox</h1>
          <p className="booking-section-hint">Chat with parents about upcoming and past sessions.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setNewMessageOpen(true)}>
          <SendIcon /> New Message
        </button>
      </div>

      <div className="msgs-layout">
        <div className="msgs-list-panel">
          <div className="msgs-search">
            <SearchIcon />
            <input type="text" placeholder="Search parents..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {conversations === null ? null : filtered.length === 0 ? (
            <div className="msgs-empty-inline">
              {conversations.length === 0 ? "No conversations yet. Parents you've been booked by can message you here." : 'No conversations match.'}
            </div>
          ) : (
            <div className="msgs-conv-list">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={c.id === selectedId ? 'msgs-conv-row active' : 'msgs-conv-row'}
                  onClick={() => setSelectedId(c.id)}
                >
                  <Avatar name={c.counterpart.name} photoUrl={c.counterpart.photoUrl} className="msgs-conv-avatar" />
                  <div className="msgs-conv-info">
                    <div className="msgs-conv-top">
                      <strong>{c.counterpart.name}</strong>
                      <span className="msgs-conv-time">{formatTime(c.lastMessageAt)}</span>
                    </div>
                    <p>{c.lastMessagePreview || 'No messages yet'}</p>
                  </div>
                  {c.unreadCount > 0 && <span className="msgs-conv-badge">{c.unreadCount}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="msgs-thread-panel">
          {!selected ? (
            <div className="msgs-thread-empty">
              <ChatIcon />
              <p>Select a conversation or start a new one with a parent you've been booked by.</p>
            </div>
          ) : (
            <>
              <div className="msgs-thread-header">
                <Avatar name={selected.counterpart.name} photoUrl={selected.counterpart.photoUrl} className="msgs-conv-avatar" />
                <div className="msgs-thread-header-info">
                  <strong>{selected.counterpart.name}</strong>
                  <span>Parent</span>
                </div>
              </div>

              <div className="msgs-thread-body">
                {messages === null ? null : (
                  <>
                    {messages.map((m) => (
                      <div key={m.id} className={m.senderIsMe ? 'msgs-bubble-row me' : 'msgs-bubble-row'}>
                        <div className="msgs-bubble">
                          {m.studentName && (
                            <span className="msgs-note-tag"><NoteIcon /> Note about {m.studentName}</span>
                          )}
                          <p>{m.body}</p>
                          <span className="msgs-bubble-time">
                            {formatTime(m.createdAt)}
                            {m.senderIsMe && m.readAt && <CheckIcon />}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <form className="msgs-composer" onSubmit={handleSend}>
                {students.length > 0 && (
                  <select value={noteStudentId} onChange={(e) => setNoteStudentId(e.target.value)} className="msgs-student-picker" title="Tag this message about a student">
                    <option value="">General message</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>Note: {s.fullName}</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                />
                <button type="submit" className="msgs-send-btn" disabled={!composerText.trim() || sending} aria-label="Send message">
                  <SendIcon />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {newMessageOpen && <NewMessageModal onClose={() => setNewMessageOpen(false)} onPick={startConversationWith} />}
    </div>
  );
}

function NewMessageModal({ onClose, onPick }: { onClose: () => void; onPick: (parentId: string) => void }) {
  const [parents, setParents] = useState<{ id: string; name: string }[] | null>(null);

  useEffect(() => {
    apiRequest<{ parents: { id: string; name: string }[] }>('/api/messages/messageable-parents')
      .then((res) => setParents(res.data?.parents ?? []))
      .catch(() => setParents([]));
  }, []);

  return (
    <Modal title="New Message" onClose={onClose}>
      {parents === null ? null : parents.length === 0 ? (
        <p className="booking-section-hint">You can message parents once they've booked a session with you.</p>
      ) : (
        <div className="msgs-newmsg-list">
          {parents.map((p) => (
            <button key={p.id} type="button" className="msgs-newmsg-row" onClick={() => onPick(p.id)}>
              <Avatar name={p.name} className="msgs-conv-avatar" />
              <div className="msgs-conv-info">
                <strong>{p.name}</strong>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
