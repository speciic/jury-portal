import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Wiping all dummy database records...');

  // Delete all existing data in reverse relational dependency order
  await prisma.evaluationScore.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.juryTeamAssignment.deleteMany();
  await prisma.team.deleteMany();
  await prisma.problemStatement.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.venue.deleteMany();

  // Create single primary Admin account for manual organizer access
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      name: 'Organizer Admin',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      active: true,
    },
  });

  console.log('✨ All fake data removed and database reset cleanly!');
  console.log('🔑 Organizer Admin Credentials: admin / admin123');
}

main()
  .catch((e) => {
    console.error('Error wiping database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
