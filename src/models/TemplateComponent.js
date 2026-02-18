/**
 * TemplateComponent Model
 * Individual salary components within a template
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const TemplateComponent = sequelize.define(
  'TemplateComponent',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    templateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'template_id',
      references: {
        model: 'salary_templates',
        key: 'id',
      },
    },
    componentName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'component_name',
    },
    componentCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'component_code',
      validate: {
        isUppercase: true,
        notEmpty: true,
      },
    },
    componentType: {
      type: DataTypes.ENUM('earning', 'deduction', 'employer_contribution'),
      allowNull: false,
      field: 'component_type',
    },
    calculationType: {
      type: DataTypes.ENUM('fixed', 'percent_of_ctc', 'percent_of_basic', 'percent_of_gross', 'formula'),
      allowNull: false,
      field: 'calculation_type',
    },
    value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    formulaExpression: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'formula_expression',
    },
    dependsOn: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'depends_on',
      defaultValue: [],
    },
    isTaxable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_taxable',
    },
    affectsPf: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'affects_pf',
    },
    affectsEsi: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'affects_esi',
    },
    isStatutory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_statutory',
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_locked',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
    },
  },
  {
    tableName: 'template_components',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['template_id', 'component_code'],
      },
      {
        fields: ['template_id', 'display_order'],
      },
    ],
  }
);

export default TemplateComponent;
