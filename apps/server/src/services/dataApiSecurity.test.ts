import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const migration = readFileSync(fileURLToPath(new URL('../../prisma/migrations/20260817130000_harden_data_api_and_add_meetings/migration.sql', import.meta.url)), 'utf8');
const privateTables = [
  'User', 'Student', 'LearningGoal', 'Booking', 'Notification', 'SavedTutor',
  'TutorView', 'Review', 'UserPreferences', 'Conversation', 'Message', 'Wallet',
  'PaymentMethod', 'Transaction', 'TutorProfile', 'TutorVerificationEvent',
  'Dispute', 'DisputeEvent', 'SupportTicket', 'SupportMessage', 'AdminAuditLog',
  'AdminSetting', 'TutorAvailability', 'TutorStudentProgress', 'LoginEvent',
];

describe('Data API security migration', () => {
  it.each(privateTables)('enables RLS on %s', (table) => {
    expect(migration).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
  });

  it('revokes application-table access from browser Data API roles', () => {
    expect(migration).toMatch(/REVOKE ALL ON TABLE[\s\S]+FROM anon, authenticated;/);
  });

  it('does not add broad allow-all policies', () => {
    expect(migration).not.toMatch(/CREATE\s+POLICY[\s\S]+USING\s*\(\s*true\s*\)/i);
    expect(migration).not.toMatch(/GRANT\s+ALL[\s\S]+(?:anon|authenticated)/i);
  });

  it('revokes legacy default table privileges for future migrations', () => {
    expect(migration).toMatch(/ALTER DEFAULT PRIVILEGES IN SCHEMA public[\s\S]+REVOKE ALL ON TABLES FROM anon, authenticated;/);
  });
});
