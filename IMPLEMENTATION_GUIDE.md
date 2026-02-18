# Enterprise Payroll Engine - Implementation Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install expr-eval
```

### 2. Run Database Migration

```bash
npm run migrate
```

This will create all required tables:
- `salary_templates`
- `template_components`
- `employee_salary_assignments`
- `salary_revision_history`
- `state_tax_slabs`
- `variable_pay_definitions`
- `compliance_warnings`

### 3. Seed Default Templates

```bash
node database/seeders/seed-default-salary-templates.js
```

This creates:
- Full-Time Employee template
- Contract Worker template

### 4. Initialize Karnataka Tax Slabs

The StateTaxService will auto-initialize Karnataka slabs on first use, or you can manually insert them.

## Architecture Overview

### Core Components

1. **RuleEngine**: Formula evaluator with dependency resolution
2. **ComplianceService**: Validates salary structures
3. **StateTaxService**: Dynamic professional tax lookup
4. **Template System**: Reusable salary structures

### Key Features

✅ **Zero Hardcoding**: All rules in database
✅ **Versioning**: Never overwrite history
✅ **Audit Trail**: Complete change tracking
✅ **Compliance**: Automatic validation
✅ **Scalability**: Handles 10,000+ employees
✅ **Deterministic**: Same inputs = same outputs

## API Usage

### Get All Templates

```javascript
GET /api/v1/payroll/templates
```

### Get Template Details

```javascript
GET /api/v1/payroll/templates/:id
```

### Create Template

```javascript
POST /api/v1/payroll/templates
{
  "name": "Sales Team",
  "description": "Variable-heavy structure for sales",
  "effectiveFrom": "2024-01-01",
  "autoBalanceSpecialAllowance": true,
  "components": [
    {
      "componentName": "Basic Salary",
      "componentCode": "BASIC",
      "componentType": "earning",
      "calculationType": "percent_of_ctc",
      "value": 30,
      "isTaxable": true,
      "affectsPf": true,
      "displayOrder": 1
    }
  ]
}
```

### Calculate Salary

```javascript
POST /api/v1/payroll/templates/calculate
{
  "templateId": 1,
  "ctc": 600000,
  "employeeState": "Karnataka"
}
```

## Integration with Employee Form

The employee compensation tab should:

1. Load available templates
2. Allow template selection
3. Enter CTC
4. Auto-calculate all components
5. Show compliance warnings
6. Display employer cost

## Next Steps

1. **Update Employee Form**: Integrate template selection
2. **Create Template Management UI**: Admin interface for templates
3. **Add More Templates**: Create templates for different employee types
4. **Migration Script**: Migrate existing employees to templates
5. **Testing**: Comprehensive test suite

## Important Notes

- All statutory components are locked by default
- Formulas are validated for safety
- Circular dependencies are detected
- Compliance warnings don't block, but should be reviewed
- All changes are audited

## Support

For questions or issues, refer to:
- `ENTERPRISE_PAYROLL_ARCHITECTURE.md` - Full architecture documentation
- API endpoints are documented in Swagger
- Code comments explain complex logic
