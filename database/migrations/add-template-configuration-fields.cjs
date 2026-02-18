/**
 * Add Template Configuration Fields
 * Adds metro/non-metro HRA config, CTC mode toggle, and other enterprise features
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // Check if columns already exist
    const tableDescription = await queryInterface.describeTable('salary_templates');
    
    // Add HRA configuration
    if (!tableDescription.hra_metro_percent) {
      await queryInterface.addColumn('salary_templates', 'hra_metro_percent', {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 50.00,
        comment: 'HRA percentage for metro cities (default 50%)',
      });
    }

    if (!tableDescription.hra_non_metro_percent) {
      await queryInterface.addColumn('salary_templates', 'hra_non_metro_percent', {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 40.00,
        comment: 'HRA percentage for non-metro cities (default 40%)',
      });
    }

    // Add CTC mode configuration
    if (!tableDescription.include_employer_in_ctc) {
      await queryInterface.addColumn('salary_templates', 'include_employer_in_ctc', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, employer contributions are included in CTC',
      });
    }

    // Add PF cap configuration
    if (!tableDescription.pf_cap_amount) {
      await queryInterface.addColumn('salary_templates', 'pf_cap_amount', {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 1800.00,
        comment: 'Maximum PF contribution cap (default ₹1800)',
      });
    }

    if (!tableDescription.pf_cap_threshold) {
      await queryInterface.addColumn('salary_templates', 'pf_cap_threshold', {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 15000.00,
        comment: 'Basic salary threshold for PF cap (default ₹15000)',
      });
    }

    // Add ESI threshold configuration
    if (!tableDescription.esi_threshold) {
      await queryInterface.addColumn('salary_templates', 'esi_threshold', {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 21000.00,
        comment: 'Gross salary threshold for ESI applicability (default ₹21000)',
      });
    }

    // Add Gratuity configuration
    if (!tableDescription.gratuity_rate) {
      await queryInterface.addColumn('salary_templates', 'gratuity_rate', {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        defaultValue: 0.0481,
        comment: 'Gratuity rate as percentage of basic (default 4.81%)',
      });
    }

    if (!tableDescription.include_gratuity_in_ctc) {
      await queryInterface.addColumn('salary_templates', 'include_gratuity_in_ctc', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, gratuity is included in CTC',
      });
    }

    // Add metro cities configuration (JSON array)
    if (!tableDescription.metro_cities) {
      await queryInterface.addColumn('salary_templates', 'metro_cities', {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of metro city names for HRA calculation',
        defaultValue: JSON.stringify(['Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Bangalore', 'Hyderabad', 'Pune']),
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('salary_templates', 'hra_metro_percent');
    await queryInterface.removeColumn('salary_templates', 'hra_non_metro_percent');
    await queryInterface.removeColumn('salary_templates', 'include_employer_in_ctc');
    await queryInterface.removeColumn('salary_templates', 'pf_cap_amount');
    await queryInterface.removeColumn('salary_templates', 'pf_cap_threshold');
    await queryInterface.removeColumn('salary_templates', 'esi_threshold');
    await queryInterface.removeColumn('salary_templates', 'gratuity_rate');
    await queryInterface.removeColumn('salary_templates', 'include_gratuity_in_ctc');
    await queryInterface.removeColumn('salary_templates', 'metro_cities');
  },
};
