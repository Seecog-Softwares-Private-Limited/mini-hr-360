// Migration: organization setup wizard tables and business extensions
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const bizDesc = await queryInterface.describeTable('businesses');
    const bizCols = [
      { name: 'legalName', definition: { type: Sequelize.STRING(255), allowNull: true } },
      { name: 'displayName', definition: { type: Sequelize.STRING(255), allowNull: true } },
      { name: 'gstNumber', definition: { type: Sequelize.STRING(20), allowNull: true } },
      { name: 'panNumber', definition: { type: Sequelize.STRING(10), allowNull: true } },
      { name: 'tanNumber', definition: { type: Sequelize.STRING(10), allowNull: true } },
      { name: 'city', definition: { type: Sequelize.STRING(100), allowNull: true } },
      { name: 'state', definition: { type: Sequelize.STRING(100), allowNull: true } },
      { name: 'pincode', definition: { type: Sequelize.STRING(10), allowNull: true } },
      { name: 'logoUrl', definition: { type: Sequelize.STRING(500), allowNull: true } },
      { name: 'financialYearStartMonth', definition: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 4 } },
    ];
    for (const col of bizCols) {
      if (!bizDesc[col.name]) {
        await queryInterface.addColumn('businesses', col.name, col.definition);
      }
    }

    const ltDesc = await queryInterface.describeTable('leave_types');
    if (!ltDesc.policyConfig) {
      await queryInterface.addColumn('leave_types', 'policyConfig', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      });
    }

    const scTables = await queryInterface.showAllTables();
    if (!scTables.includes('organization_setup_progress')) {
      await queryInterface.createTable('organization_setup_progress', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'businesses', key: 'id' } },
        currentStep: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        completedSteps: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
        skippedSteps: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
        setupCompleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        completedAt: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    if (!scTables.includes('organization_statutory_settings')) {
      await queryInterface.createTable('organization_statutory_settings', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'businesses', key: 'id' } },
        pfEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        pfEstablishmentNumber: { type: Sequelize.STRING(50), allowNull: true },
        employeePfRate: { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 12.0 },
        employerPfRate: { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 12.0 },
        esiEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        esiEmployerCode: { type: Sequelize.STRING(50), allowNull: true },
        ptEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        ptState: { type: Sequelize.STRING(100), allowNull: true },
        tdsEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        tanNumber: { type: Sequelize.STRING(10), allowNull: true },
        payrollBankAccountName: { type: Sequelize.STRING(150), allowNull: true },
        payrollBankAccountNumber: { type: Sequelize.STRING(30), allowNull: true },
        payrollBankIfsc: { type: Sequelize.STRING(15), allowNull: true },
        payrollBankName: { type: Sequelize.STRING(150), allowNull: true },
        payrollBankBranch: { type: Sequelize.STRING(150), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    if (!scTables.includes('branch_locations')) {
      await queryInterface.createTable('branch_locations', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'businesses', key: 'id' } },
        name: { type: Sequelize.STRING(150), allowNull: false },
        code: { type: Sequelize.STRING(32), allowNull: true },
        address: { type: Sequelize.TEXT, allowNull: true },
        city: { type: Sequelize.STRING(100), allowNull: true },
        state: { type: Sequelize.STRING(100), allowNull: true },
        country: { type: Sequelize.STRING(100), allowNull: true },
        pincode: { type: Sequelize.STRING(10), allowNull: true },
        locationType: { type: Sequelize.ENUM('HEAD_OFFICE', 'BRANCH', 'REMOTE', 'CLIENT_SITE'), allowNull: false, defaultValue: 'BRANCH' },
        isPrimary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
        longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
        geoFenceRadiusMeters: { type: Sequelize.INTEGER, allowNull: true },
        status: { type: Sequelize.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('branch_locations', ['businessId']);
    }

    if (!scTables.includes('attendance_rules')) {
      await queryInterface.createTable('attendance_rules', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'businesses', key: 'id' } },
        workWeekConfig: { type: Sequelize.JSON, allowNull: false, defaultValue: { type: 'MON_FRI', days: [1, 2, 3, 4, 5] } },
        defaultShiftId: { type: Sequelize.INTEGER, allowNull: true },
        gracePeriodMinutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
        halfDayThresholdHours: { type: Sequelize.DECIMAL(4, 2), allowNull: false, defaultValue: 4.0 },
        fullDayThresholdHours: { type: Sequelize.DECIMAL(4, 2), allowNull: false, defaultValue: 8.0 },
        autoAbsentEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        lateMarkAllowedCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 3 },
        overtimeEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        geoAttendanceEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        selfieAttendanceEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        regularizationAllowed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        attendanceLockDay: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    if (!scTables.includes('audit_logs')) {
      await queryInterface.createTable('audit_logs', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        businessId: { type: Sequelize.INTEGER, allowNull: true },
        action: { type: Sequelize.STRING(80), allowNull: false },
        module: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'setup' },
        oldValue: { type: Sequelize.JSON, allowNull: true },
        newValue: { type: Sequelize.JSON, allowNull: true },
        ipAddress: { type: Sequelize.STRING(45), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('audit_logs', ['businessId']);
      await queryInterface.addIndex('audit_logs', ['action']);
    }

    if (scTables.includes('salary_components')) {
      const scDesc = await queryInterface.describeTable('salary_components');
      const scCols = [
        { name: 'componentType', definition: { type: Sequelize.ENUM('earning', 'deduction', 'employer_contribution', 'reimbursement'), allowNull: true } },
        { name: 'value', definition: { type: Sequelize.DECIMAL(12, 2), allowNull: true } },
        { name: 'formula', definition: { type: Sequelize.TEXT, allowNull: true } },
        { name: 'showInPayslip', definition: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true } },
        { name: 'isDefault', definition: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false } },
        { name: 'status', definition: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' } },
      ];
      for (const col of scCols) {
        if (!scDesc[col.name]) {
          await queryInterface.addColumn('salary_components', col.name, col.definition);
        }
      }
    } else {
      await queryInterface.createTable('salary_components', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        businessId: { type: Sequelize.INTEGER, allowNull: false },
        name: { type: Sequelize.STRING(64), allowNull: false },
        code: { type: Sequelize.STRING(32), allowNull: false },
        type: { type: Sequelize.ENUM('EARNING', 'DEDUCTION'), allowNull: false },
        componentType: { type: Sequelize.ENUM('earning', 'deduction', 'employer_contribution', 'reimbursement'), allowNull: true },
        calculationType: { type: Sequelize.ENUM('FIXED', 'PERCENTAGE', 'FORMULA'), allowNull: false },
        value: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        formula: { type: Sequelize.TEXT, allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: true, defaultValue: {} },
        isTaxable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        isStatutory: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        showInPayslip: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        isDefault: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('salary_components', ['businessId']);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('audit_logs').catch(() => {});
    await queryInterface.dropTable('attendance_rules').catch(() => {});
    await queryInterface.dropTable('branch_locations').catch(() => {});
    await queryInterface.dropTable('organization_statutory_settings').catch(() => {});
    await queryInterface.dropTable('organization_setup_progress').catch(() => {});
  },
};
