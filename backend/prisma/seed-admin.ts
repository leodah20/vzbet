import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Local dev convenience only: creates/updates a single ADMIN account with
// email "admin" (not a real email) and password "admin", for fast typing
// during manual testing. Does not touch any other data in the database.
async function main() {
  const passwordHash = await bcrypt.hash('admin', 10);

  await prisma.user.upsert({
    where: { email: 'admin' },
    update: { passwordHash, role: 'ADMIN' },
    create: { name: 'Admin', email: 'admin', passwordHash, role: 'ADMIN' },
  });

  console.log('Admin user ready: email "admin", password "admin".');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
