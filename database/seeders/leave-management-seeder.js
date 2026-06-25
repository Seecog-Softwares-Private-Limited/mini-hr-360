/**
 * Leave Management Seeder
 * 
 * Seeds:
 * 1. Leave Types (Casual, Sick, Earned, WFH, Unpaid)
 * 2. Leave Balances for sample employees
 * 3. Leave Requests (Pending, Approved, Rejected samples)
 * 4. Leave Approvals for approved/rejected requests
 * 
 * Usage: node database/seeders/leave-management-seeder.js
 * 
 * This seeder is idempotent - it checks for existing data before inserting.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST before any other imports
dotenv.config({ path: path.join(__dirname, '../../property.env') });

// Verify env is loaded
console.log('📋 Environment loaded:');
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('   DB_USER:', process.env.DB_USER);

// Now import database and models after env is loaded
const { sequelize } = await import('../../src/db/index.js');
const {
  Business,
  User,
  Employee,
  LeaveType,
  LeaveBalance,
} = await import('../../src/models/index.js');
import bcrypt from 'bcrypt';

const currentYear = new Date().getFullYear();

async function seed() {
  try {
    console.log('🌱 Starting Leave Management Seeder...\n');

    // Ensure database connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Sync models (creates tables if not exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Models synced\n');

    // =========================================
    // 1. Get or Create Sample Business
    // =========================================
    let business = await Business.findOne({ where: { businessName: 'Demo Company' } });
    let adminUser;

    if (!business) {
      // Create admin user first
      adminUser = await User.findOne({ where: { email: 'admin@demo.com' } });
      if (!adminUser) {
        adminUser = await User.create({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@demo.com',
          password: 'admin123', // Will be hashed by hook
          role: 'admin',
          status: 'active',
        });
        console.log('✅ Created admin user: admin@demo.com');
      }

      business = await Business.create({
        businessName: 'Demo Company',
        ownerId: adminUser.id,
        phoneNo: '9876543210',
        description: 'Demo company for testing',
        category: 'Technology',
        country: 'India',
      });
      console.log('✅ Created demo business');
    } else {
      adminUser = await User.findByPk(business.ownerId);
      console.log('✅ Using existing business: Demo Company');
    }

    const businessId = business.id;

    // =========================================
    // 2. Seed Leave Types
    // =========================================
    const leaveTypesData = [
      {
        businessId,
        name: 'Casual Leave',
        code: 'CL',
        description: 'For personal work and casual requirements',
        status: 'ACTIVE',
        sortOrder: 1,
        isPaid: true,
        allowHalfDay: true,
        maxPerYear: 12,
        allowCarryForward: false,
        requiresAttachment: false,
        minDaysNotice: 1,
        color: '#3b82f6',
      },
      {
        businessId,
        name: 'Sick Leave',
        code: 'SL',
        description: 'For health-related issues and medical appointments',
        status: 'ACTIVE',
        sortOrder: 2,
        isPaid: true,
        allowHalfDay: true,
        maxPerYear: 10,
        allowCarryForward: false,
        requiresAttachment: false,
        minDaysNotice: 0,
        color: '#ef4444',
      },
      {
        businessId,
        name: 'Earned Leave',
        code: 'EL',
        description: 'Earned/Privilege leave that can be carried forward',
        status: 'ACTIVE',
        sortOrder: 3,
        isPaid: true,
        allowHalfDay: false,
        maxPerYear: 15,
        allowCarryForward: true,
        maxCarryForward: 10,
        requiresAttachment: false,
        minDaysNotice: 7,
        color: '#22c55e',
      },
      {
        businessId,
        name: 'Work From Home',
        code: 'WFH',
        description: 'Work from home days',
        status: 'ACTIVE',
        sortOrder: 4,
        isPaid: true,
        allowHalfDay: true,
        maxPerYear: 24,
        allowCarryForward: false,
        requiresAttachment: false,
        minDaysNotice: 1,
        color: '#8b5cf6',
      },
      {
        businessId,
        name: 'Unpaid Leave',
        code: 'UL',
        description: 'Leave without pay',
        status: 'ACTIVE',
        sortOrder: 5,
        isPaid: false,
        allowHalfDay: false,
        maxPerYear: null, // Unlimited
        allowCarryForward: false,
        requiresAttachment: false,
        minDaysNotice: 3,
        color: '#64748b',
      },
    ];

    const leaveTypes = {};
    for (const ltData of leaveTypesData) {
      const [lt, created] = await LeaveType.findOrCreate({
        where: { businessId, code: ltData.code },
        defaults: ltData,
      });
      leaveTypes[ltData.code] = lt;
      console.log(`${created ? '✅ Created' : '⏭️ Exists'} leave type: ${ltData.name}`);
    }

    // =========================================
    // 3. Create Sample Employees with Login
    // =========================================
    // Note: Password will be hashed by the Employee model's beforeSave hook
    const plainPassword = 'employee123';
    
    const employeesData = [
      {
        userId: adminUser.id,
        businessId,
        firstName: 'John',
        middleName: null,
        lastName: 'Doe',
        empName: 'John Doe',
        empId: 'EMP0001',
        empEmail: 'john.doe@demo.com',
        empPhone: '9876543211',
        empDesignation: 'Software Engineer',
        empDepartment: 'Engineering',
        empWorkLoc: 'Bangalore',
        empDateOfJoining: '2023-01-15',
        empDob: '1995-05-20',
        empCtc: 1200000,
        employeeType: 'Permanent',
        employmentStatus: 'Active',
        isActive: true,
        canLogin: true,
        password: plainPassword,
        role: 'EMPLOYEE',
      },
      {
        userId: adminUser.id,
        businessId,
        firstName: 'Jane',
        middleName: 'Marie',
        lastName: 'Smith',
        empName: 'Jane Marie Smith',
        empId: 'EMP0002',
        empEmail: 'jane.smith@demo.com',
        empPhone: '9876543212',
        empDesignation: 'Product Manager',
        empDepartment: 'Product',
        empWorkLoc: 'Mumbai',
        empDateOfJoining: '2022-06-01',
        empDob: '1992-08-15',
        empCtc: 1800000,
        employeeType: 'Permanent',
        employmentStatus: 'Active',
        isActive: true,
        canLogin: true,
        password: plainPassword,
        role: 'EMPLOYEE',
      },
      {
        userId: adminUser.id,
        businessId,
        firstName: 'Mike',
        middleName: null,
        lastName: 'Johnson',
        empName: 'Mike Johnson',
        empId: 'EMP0003',
        empEmail: 'mike.johnson@demo.com',
        empPhone: '9876543213',
        empDesignation: 'HR Manager',
        empDepartment: 'Human Resources',
        empWorkLoc: 'Delhi',
        empDateOfJoining: '2021-03-10',
        empDob: '1988-12-25',
        empCtc: 2000000,
        employeeType: 'Permanent',
        employmentStatus: 'Active',
        isActive: true,
        canLogin: true,
        password: plainPassword,
        role: 'HR',
      },
    ];

    const employees = {};
    for (const empData of employeesData) {
      let emp = await Employee.findOne({ 
        where: { empEmail: empData.empEmail } 
      });
      
      if (!emp) {
        emp = await Employee.create(empData);
        console.log(`✅ Created employee: ${empData.empName} (${empData.empId})`);
      } else {
        // Always update login credentials to fix any password issues
        emp.canLogin = true;
        emp.password = plainPassword; // Will be hashed by beforeSave hook
        emp.role = empData.role;
        emp.businessId = businessId;
        await emp.save();
        console.log(`✅ Updated employee login: ${empData.empName}`);
      }
      employees[empData.empId] = emp;
    }

    // =========================================
    // 4. Seed Leave Balances
    // =========================================
    for (const empId in employees) {
      const emp = employees[empId];
      
      for (const code in leaveTypes) {
        const lt = leaveTypes[code];
        
        const [balance, created] = await LeaveBalance.findOrCreate({
          where: {
            businessId,
            employeeId: emp.id,
            leaveTypeId: lt.id,
            year: currentYear,
          },
          defaults: {
            businessId,
            employeeId: emp.id,
            leaveTypeId: lt.id,
            year: currentYear,
            allocated: lt.maxPerYear || 0,
            used: 0,
            pending: 0,
            carriedForward: 0,
          },
        });
        
        if (created) {
          console.log(`✅ Created balance: ${emp.empName} - ${lt.name}`);
        }
      }
    }

    // Leave requests are created by employees via the portal — no sample requests seeded.
    console.log('⏭️ Skipping sample leave requests (apply via employee portal)');

    console.log('\n✅ Leave Management Seeder completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('   Employee Portal: /employee/login');
    console.log('   Email: john.doe@demo.com OR jane.smith@demo.com');
    console.log('   Password: employee123');
    console.log('\n   Admin Portal: /login');
    console.log('   Email: admin@demo.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Seeder error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run seeder
seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
