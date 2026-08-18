import { describe, expect, it } from 'vitest';
import { updateMeetingSchema } from './meeting.schemas.js';

describe('updateMeetingSchema', () => {
  it('accepts an HTTPS external meeting URL', () => {
    expect(updateMeetingSchema.safeParse({ provider: 'GOOGLE_MEET', meetingUrl: 'https://meet.google.com/abc-defg-hij' }).success).toBe(true);
  });

  it('rejects insecure HTTP meeting URLs', () => {
    expect(updateMeetingSchema.safeParse({ provider: 'ZOOM', meetingUrl: 'http://example.com/meeting' }).success).toBe(false);
  });

  it('rejects script URLs', () => {
    expect(updateMeetingSchema.safeParse({ provider: 'OTHER', meetingUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
});
