import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || './property.env' });

import { sequelize } from '../src/db/index.js';
import { User } from '../src/models/User.js';

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    const users = [
      { email: 'hr@demo.com', password: 'HrPass123!' },
      { email: 'finance@demo.com', password: 'FinPass123!' }
    ];

    for (const u of users) {
      const user = await User.findOne({ where: { email: u.email } });
      if (!user) {
        console.log('User not found, creating:', u.email);
        await User.create({ email: u.email, firstName: u.email.split('@')[0], password: u.password, role: u.email.startsWith('hr') ? 'HR_MANAGER' : 'FINANCE', status: 'active' });
        continue;
      }
      // Set plain password and save so hooks hash it exactly once
      user.password = u.password;
      await user.save();
      console.log('Updated password for', u.email);
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    try { await sequelize.close(); } catch(e){}
    process.exit(1);
  }
}

run();
