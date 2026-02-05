import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || './property.env' });

import { sequelize } from '../src/db/index.js';
import { User } from '../src/models/User.js';
import bcrypt from 'bcrypt';

async function upsertUser(email, firstName, role, password) {
  const hash = await bcrypt.hash(password, 10);
  // Try to find existing user
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    existing.firstName = firstName;
    existing.role = role;
    existing.password = hash;
    existing.status = 'active';
    await existing.save();
    return existing;
  }
  const user = await User.create({ email, firstName, password: hash, role, status: 'active' });
  return user;
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    // Define test credentials (change if you prefer)
    const hr = { email: 'hr@demo.com', name: 'HR Tester', role: 'HR_MANAGER', password: 'HrPass123!' };
    const fin = { email: 'finance@demo.com', name: 'Finance Tester', role: 'FINANCE', password: 'FinPass123!' };

    const hrUser = await upsertUser(hr.email, hr.name, hr.role, hr.password);
    const finUser = await upsertUser(fin.email, fin.name, fin.role, fin.password);

    console.log('\nCreated/updated users:');
    console.log('HR ->', { id: hrUser.id, email: hrUser.email, role: hrUser.role, password: hr.password });
    console.log('Finance ->', { id: finUser.id, email: finUser.email, role: finUser.role, password: fin.password });

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error creating test users:', err);
    try { await sequelize.close(); } catch (e) {}
    process.exit(1);
  }
}

run();
