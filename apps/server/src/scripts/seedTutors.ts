import prisma from '../db.js';
import { findOrCreateAuthUser } from './authUser.js';

const TUTORS: { id: string; name: string }[] = [
  { id: 't1', name: 'Michael Okafor' },
  { id: 't2', name: 'Ruth Adeyemi' },
  { id: 't3', name: 'Daniel Yusuf' },
  { id: 't4', name: 'Hauwa Ibrahim' },
  { id: 't5', name: 'Amaka Nwosu' },
  { id: 't6', name: 'Tunde Adebayo' },
  { id: 't7', name: 'Amara Chukwu' },
  { id: 't8', name: 'Bola Fashola' },
  { id: 't9', name: 'Ngozi Eze' },
  { id: 't10', name: 'Emeka Obi' },
  { id: 't11', name: 'Chidinma Okoro' },
  { id: 't12', name: 'Yusuf Bello' },
];

if (process.env.NODE_ENV === 'production') {
  throw new Error('Tutor seeding is disabled in production.');
}

const configuredSeedPassword = process.env.SEED_TUTOR_PASSWORD;
if (!configuredSeedPassword || configuredSeedPassword.length < 12) {
  throw new Error('Set SEED_TUTOR_PASSWORD to a development-only password of at least 12 characters.');
}
const DEV_PASSWORD: string = configuredSeedPassword;

function emailFor(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '.');
  return `${slug}@mentora-tutors.dev`;
}

async function main() {
  for (const t of TUTORS) {
    const email = emailFor(t.name);
    const authUser = await findOrCreateAuthUser({ email, password: DEV_PASSWORD, name: t.name, role: 'TUTOR' });

    await prisma.user.upsert({
      where: { id: t.id },
      update: { supabaseUserId: authUser.id, email, emailVerified: true },
      create: { id: t.id, supabaseUserId: authUser.id, email, name: t.name, role: 'TUTOR', emailVerified: true },
    });
    // These are established catalog tutors, not brand-new signups - they should
    // already be past onboarding, not redirected into the Complete Profile /
    // Verification flow the first time they log in.
    await prisma.tutorProfile.upsert({
      where: { userId: t.id },
      update: {},
      create: {
        userId: t.id,
        profileCompletedAt: new Date(),
        verificationStatus: 'APPROVED',
        submittedAt: new Date(),
      },
    });
    console.log(`seeded ${t.id} -> ${email}`);
  }
  console.log('\nTutor seed completed.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
