/**
 * One-time script: create an admin user in Firebase Auth + MongoDB.
 * Run: npx tsx scripts/create-admin.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { firebaseAuth } from '../src/config/firebase.js';
import { connectMongoDB } from '../src/config/mongodb.js';
import { User } from '../src/models/User.js';

const EMAIL       = 'bharat@pheonixsolutions.com';
const PASSWORD    = 'abcd1234@EF';
const DISPLAY_NAME = 'Bharat';

async function main() {
  await connectMongoDB();

  // ── 1. Create (or fetch) Firebase Auth user ───────────────────────────────
  let firebaseUser;
  try {
    firebaseUser = await firebaseAuth.createUser({
      email:         EMAIL,
      password:      PASSWORD,
      displayName:   DISPLAY_NAME,
      emailVerified: true,
    });
    console.log('✅ Firebase user created:', firebaseUser.uid);
  } catch (err: any) {
    if (err.code === 'auth/email-already-exists') {
      firebaseUser = await firebaseAuth.getUserByEmail(EMAIL);
      console.log('ℹ️  Firebase user already exists:', firebaseUser.uid);
    } else {
      throw err;
    }
  }

  // ── 2. Upsert MongoDB record with role = admin ────────────────────────────
  const user = await User.findOneAndUpdate(
    { firebaseUid: firebaseUser.uid },
    {
      $set: {
        email:       EMAIL,
        displayName: DISPLAY_NAME,
        photoURL:    '',
        role:        'admin',
        isActive:    true,
        lastLogin:   new Date(),
      },
    },
    { upsert: true, new: true }
  );

  console.log('✅ MongoDB admin user ready:');
  console.log('   ID:    ', user._id.toString());
  console.log('   Email: ', user.email);
  console.log('   Role:  ', user.role);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message ?? err);
  process.exit(1);
});
