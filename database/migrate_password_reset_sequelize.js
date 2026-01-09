// Migration script using Sequelize (uses same connection as app)
// Run: DOTENV_CONFIG_PATH=./property.env node -r dotenv/config --experimental-json-modules database/migrate_password_reset_sequelize.js

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sequelize } from '../src/db/index.js';
import { User } from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', 'property.env') });

async function migrate() {
  try {
    console.log('🔧 Connecting to database via Sequelize...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Use Sequelize's queryInterface to add columns
    const queryInterface = sequelize.getQueryInterface();
    
    // First, list all tables to see what exists
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log('📋 Available tables:', tables.map(t => Object.values(t)[0]));
    
    // Check if users table exists (case-sensitive check)
    const usersTableExists = tables.some(t => {
      const tableName = Object.values(t)[0];
      return tableName.toLowerCase() === 'users';
    });
    
    if (!usersTableExists) {
      console.error('❌ Error: The "users" table does not exist in the database.');
      console.error('💡 Please run the database seed script first: npm run seed-db');
      console.error('   Or create the users table manually before running this migration.');
      throw new Error('Users table does not exist');
    }
    
    // Get the actual table name (might be case-sensitive)
    const actualTableName = tables.find(t => Object.values(t)[0].toLowerCase() === 'users');
    const tableName = Object.values(actualTableName)[0];
    console.log(`✅ Found users table: ${tableName}`);
    
    // Check if columns exist
    const tableDescription = await queryInterface.describeTable(tableName);
    const hasPasswordResetToken = 'passwordResetToken' in tableDescription;
    const hasPasswordResetExpires = 'passwordResetExpires' in tableDescription;

    if (hasPasswordResetToken && hasPasswordResetExpires) {
      console.log('✅ Password reset columns already exist. Skipping migration.');
      return;
    }

    console.log('📝 Adding password reset columns...');

    // Add passwordResetToken if missing
    if (!hasPasswordResetToken) {
      await queryInterface.addColumn(tableName, 'passwordResetToken', {
        type: sequelize.DataTypes.STRING,
        allowNull: true,
        after: 'refreshTokenExpiresAt'
      });
      console.log('✅ Added passwordResetToken column');
    }

    // Add passwordResetExpires if missing
    if (!hasPasswordResetExpires) {
      await queryInterface.addColumn(tableName, 'passwordResetExpires', {
        type: sequelize.DataTypes.DATE,
        allowNull: true,
        after: 'passwordResetToken'
      });
      console.log('✅ Added passwordResetExpires column');
    }

    // Add indexes
    try {
      await queryInterface.addIndex(tableName, ['passwordResetToken'], {
        name: 'idx_password_reset_token'
      });
      console.log('✅ Created index on passwordResetToken');
    } catch (err) {
      if (err.name === 'SequelizeDatabaseError' && err.original?.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Index on passwordResetToken already exists');
      } else {
        throw err;
      }
    }

    try {
      await queryInterface.addIndex(tableName, ['passwordResetExpires'], {
        name: 'idx_password_reset_expires'
      });
      console.log('✅ Created index on passwordResetExpires');
    } catch (err) {
      if (err.name === 'SequelizeDatabaseError' && err.original?.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Index on passwordResetExpires already exists');
      } else {
        throw err;
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('📋 Password reset fields have been added to the users table.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

migrate();

