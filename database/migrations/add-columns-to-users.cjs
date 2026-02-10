const { DataTypes } = require('sequelize');

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            const tableDescription = await queryInterface.describeTable('users', { transaction });

            // List of columns to add with their definitions
            const columnsToAdd = {
                middleName: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                    after: 'lastName'
                },
                gender: {
                    type: DataTypes.ENUM('Male', 'Female', 'Non-binary', 'Prefer not to say'),
                    allowNull: true
                },
                maritalStatus: {
                    type: DataTypes.ENUM('Single', 'Married', 'Other'),
                    allowNull: true
                },
                bloodGroup: {
                    type: DataTypes.STRING(10),
                    allowNull: true
                },
                nationality: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                religion: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                casteCategory: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                languagesKnown: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                altPhone: {
                    type: DataTypes.STRING(10),
                    allowNull: true
                },
                dob: {
                    type: DataTypes.DATEONLY,
                    allowNull: true
                },
                emergencyContactName: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                emergencyContactRelation: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                emergencyContactNumber: {
                    type: DataTypes.STRING(10),
                    allowNull: true
                },
                presentAddressLine1: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                presentAddressLine2: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                presentCity: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                presentState: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                presentZip: {
                    type: DataTypes.STRING(20),
                    allowNull: true
                },
                presentCountry: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                permanentAddressLine1: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                permanentAddressLine2: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                permanentCity: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                permanentState: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                permanentZip: {
                    type: DataTypes.STRING(20),
                    allowNull: true
                },
                permanentCountry: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                employeeId: {
                    type: DataTypes.STRING(50),
                    allowNull: true
                },
                employeeType: {
                    type: DataTypes.ENUM('Permanent', 'Contract', 'Intern', 'Consultant', 'Trainee'),
                    defaultValue: 'Permanent'
                },
                designation: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                department: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                division: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                subDepartment: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                gradeBandLevel: {
                    type: DataTypes.STRING(100),
                    allowNull: true
                },
                workLoc: {
                    type: DataTypes.STRING(255),
                    allowNull: true
                },
                dateOfJoining: {
                    type: DataTypes.DATEONLY,
                    allowNull: true
                },
                probationPeriodMonths: {
                    type: DataTypes.INTEGER,
                    allowNull: true
                },
                confirmationDate: {
                    type: DataTypes.DATEONLY,
                    allowNull: true
                },
                employmentStatus: {
                    type: DataTypes.ENUM('Active', 'On Leave', 'Resigned', 'Terminated', 'Retired'),
                    defaultValue: 'Active'
                },
                workMode: {
                    type: DataTypes.ENUM('On-site', 'Hybrid', 'Remote'),
                    defaultValue: 'On-site'
                },
                ctc: {
                    type: DataTypes.DECIMAL(15, 2),
                    defaultValue: 0
                },
                overtimeEligible: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false
                }
            };

            // Add columns that don't already exist
            for (const [columnName, columnDef] of Object.entries(columnsToAdd)) {
                if (!tableDescription[columnName]) {
                    console.log(`Adding column: ${columnName}`);
                    await queryInterface.addColumn('users', columnName, columnDef, { transaction });
                } else {
                    console.log(`⏭️  Column '${columnName}' already exists, skipping...`);
                }
            }

            await transaction.commit();
            console.log('✅ Migration completed successfully!');
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration failed:', error.message);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            const columnsToRemove = [
                'middleName', 'gender', 'maritalStatus', 'bloodGroup', 'nationality',
                'religion', 'casteCategory', 'languagesKnown', 'altPhone', 'dob',
                'emergencyContactName', 'emergencyContactRelation', 'emergencyContactNumber',
                'presentAddressLine1', 'presentAddressLine2', 'presentCity', 'presentState',
                'presentZip', 'presentCountry', 'permanentAddressLine1', 'permanentAddressLine2',
                'permanentCity', 'permanentState', 'permanentZip', 'permanentCountry',
                'employeeId', 'employeeType', 'designation', 'department', 'division',
                'subDepartment', 'gradeBandLevel', 'workLoc', 'dateOfJoining',
                'probationPeriodMonths', 'confirmationDate', 'employmentStatus', 'workMode',
                'ctc', 'overtimeEligible'
            ];

            for (const columnName of columnsToRemove) {
                await queryInterface.removeColumn('users', columnName, { transaction });
            }

            await transaction.commit();
            console.log('✅ Rollback completed successfully!');
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Rollback failed:', error.message);
            throw error;
        }
    }
};
