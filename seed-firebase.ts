import { adminDb } from './src/lib/firebase-admin';
import bcrypt from 'bcryptjs';

async function main() {
  if (!adminDb) {
    console.error("Firebase admin DB not initialized!");
    return;
  }

  // Delete the old default admin if it exists
  await adminDb.collection('users').doc('admin-user').delete().catch(() => {});

  const adminPasswordHash = await bcrypt.hash('Speciic@2027', 10);
  
  await adminDb.collection('users').doc('speciic-admin').set({
    name: 'Speciic Admin',
    username: 'speciic', // Custom username login
    passwordHash: adminPasswordHash, // The bcrypt hashed password
    role: 'ADMIN',
    active: true,
  });

  console.log('✅ Admin user created in Firestore!');
  console.log('🔑 Credentials: speciic / Speciic@2027');
}

main().catch(console.error);
