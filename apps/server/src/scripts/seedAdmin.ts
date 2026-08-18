import prisma from '../db.js';
import { findOrCreateAuthUser } from './authUser.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Admin seeding is disabled in production.');
}

const email = process.argv[2] ?? process.env.SEED_ADMIN_EMAIL;
const password = process.argv[3] ?? process.env.SEED_ADMIN_PASSWORD;
const name = process.argv[4] ?? process.env.SEED_ADMIN_NAME ?? 'Mentora Admin';

if (!email || !password) {
  throw new Error('Provide admin seed credentials as CLI arguments or SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.');
}

async function main() {
  const authUser = await findOrCreateAuthUser({ email, password, name, role: 'ADMIN' });

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', emailVerified: true, supabaseUserId: authUser.id },
    create: { email, name, role: 'ADMIN', emailVerified: true, supabaseUserId: authUser.id },
  });
  console.log(`Admin ready: ${user.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
