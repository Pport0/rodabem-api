import { PrismaClient } from '@prisma/client';
import { seedAntt } from './seeds/antt.seed';

const prisma = new PrismaClient();

async function main() {
  await seedAntt();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });