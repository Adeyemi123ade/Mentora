import { describe, it, expect } from 'vitest';
import { resetPasswordSchema, signupSchema } from './auth.schemas';

describe('resetPasswordSchema', () => {
  it('accepts a valid email and lowercases it', () => {
    const result = resetPasswordSchema.safeParse({ email: '  Parent@Example.COM ' });
    expect(result.success).toBe(true);
    expect(result.success && result.data.email).toBe('parent@example.com');
  });

  it('rejects malformed emails', () => {
    expect(resetPasswordSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects an empty email', () => {
    expect(resetPasswordSchema.safeParse({ email: '' }).success).toBe(false);
  });

  it('rejects a missing email field', () => {
    expect(resetPasswordSchema.safeParse({}).success).toBe(false);
  });
});

describe('signupSchema', () => {
  const valid = { name: 'Amina Yusuf', email: 'amina@example.com', password: 'Strong1!', role: 'PARENT' };

  it('accepts a complete registration payload', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it('returns specific errors for every missing required field', () => {
    const result = signupSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.name?.[0]).toBeTruthy();
      expect(errors.email?.[0]).toBeTruthy();
      expect(errors.password?.[0]).toBeTruthy();
      expect(errors.role?.[0]).toBeTruthy();
    }
  });

  it('rejects passwords missing a required character class', () => {
    expect(signupSchema.safeParse({ ...valid, password: 'alllowercase1!' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, password: 'NoNumber!' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, password: 'NoSpecial1' }).success).toBe(false);
  });
});
