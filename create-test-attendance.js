import { sequelize } from './src/db/index.js';
import { AttendanceDailySummary, AttendancePunch, Employee, Business } from './src/models/index.js';

const createTestAttendanceData = async () => {
    try {
        console.log('🔄 Creating test attendance data...');

        await sequelize.authenticate();
        console.log('✅ Database connected');

        // 1. Find an employee to create data for
        const employee = await Employee.findOne({
            include: [{ model: Business, as: 'business' }]
        });

        if (!employee) {
            console.log('❌ No employees found in database. Please create an employee first.');
            process.exit(1);
        }

        console.log(`✅ Found employee: ${employee.firstName} ${employee.lastName} (ID: ${employee.id})`);

        // 2. Create attendance data for the past 5 days
        const today = new Date();
        const records = [];

        for (let i = 0; i < 5; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Create Clock In punch
            const clockInTime = new Date(date);
            clockInTime.setHours(9, 30, 0, 0);

            // Create Clock Out punch
            const clockOutTime = new Date(date);
            clockOutTime.setHours(18, 0, 0, 0);

            // Create punches
            await AttendancePunch.create({
                businessId: employee.businessId,
                employeeId: employee.id,
                date: dateStr,
                punchType: 'IN',
                punchAt: clockInTime,
                source: 'WEB',
                metaJson: { location: '0,0', ipAddress: '127.0.0.1' }
            });

            await AttendancePunch.create({
                businessId: employee.businessId,
                employeeId: employee.id,
                date: dateStr,
                punchType: 'OUT',
                punchAt: clockOutTime,
                source: 'WEB',
                metaJson: { location: '0,0', ipAddress: '127.0.0.1' }
            });

            // Create daily summary
            const workMinutes = Math.floor((clockOutTime - clockInTime) / 60000);

            const summary = await AttendanceDailySummary.create({
                businessId: employee.businessId,
                employeeId: employee.id,
                date: dateStr,
                firstInAt: clockInTime,
                lastOutAt: clockOutTime,
                workMinutes: workMinutes,
                breakMinutes: 0,
                lateMinutes: 0,
                overtimeMinutes: 0,
                status: 'PRESENT',
                source: 'AUTO'
            });

            records.push(summary);
            console.log(`   ✅ Created attendance for ${dateStr}`);
        }

        console.log(`\n✅ Successfully created ${records.length} attendance records!`);
        console.log('\nYou can now test the monthly summary API:');
        console.log(`GET /employee/attendance/api/month-summary?month=${today.toISOString().substring(0, 7)}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating test data:', error);
        process.exit(1);
    }
};

createTestAttendanceData();
