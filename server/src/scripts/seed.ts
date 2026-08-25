import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';


const SEED_USERS = [
  { name: 'Admin User',           email: 'murungimuchui@gmail.com',        role: 'admin' },
  { name: 'Sales Executive',      email: 'sales@lms.com',        role: 'sales' },
  { name: 'Sanction Officer',     email: 'sanction@lms.com',     role: 'sanction' },
  { name: 'Disbursement Officer', email: 'disbursement@lms.com', role: 'disbursement' },
  { name: 'Collection Officer',   email: 'collection@lms.com',   role: 'collection' },
  { name: 'Demo Borrower',        email: 'borrower@lms.com',     role: 'borrower' },
];

const PASSWORD = 'Password@123';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set. Make sure backend/.env exists.');
    process.exit(1);
  }

  console.log(`🔗 Connecting to: ${uri}`);
  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  const hash = await bcrypt.hash(PASSWORD, 12);

  for (const u of SEED_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      await User.findOneAndUpdate({ email: u.email }, { passwordHash: hash, role: u.role });
      console.log(` Updated  ${u.role.padEnd(14)} ${u.email}`);
    } else {
      await User.create({ ...u, passwordHash: hash });
      console.log(`Created  ${u.role.padEnd(14)} ${u.email}`);
    }
  }

  console.log('\n Login Credentials (password: Password@123)');
  console.log('─'.repeat(52));
  for (const u of SEED_USERS) {
    console.log(`  ${u.role.padEnd(14)} ${u.email}`);
  }
  console.log('─'.repeat(52));

  await mongoose.disconnect();
  console.log('\nSeeding complete! You can now login with the above credentials.\n');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
