# Enterprise Payroll Engine Architecture

## Overview

This document describes the enterprise-grade, rule-driven payroll engine designed for mid-to-large organizations operating in India, with future global extensibility.

## Core Principles

- **Compliance First**: All calculations follow statutory requirements
- **Zero Hardcoding**: All rules are configurable
- **Auditability**: Complete audit trail for all changes
- **Scalability**: Designed for 10,000+ employees
- **Deterministic**: Same inputs always produce same outputs

## Architecture Components

### 1. Database Schema

#### Core Tables

- **salary_templates**: Salary structure templates with versioning
- **template_components**: Individual salary components (earnings, deductions, employer contributions)
- **employee_salary_assignments**: Employee-to-template assignments with effective dates
- **salary_revision_history**: Complete audit trail of salary changes
- **state_tax_slabs**: Dynamic professional tax slabs by state
- **variable_pay_definitions**: Variable pay components (bonuses, incentives)
- **compliance_warnings**: Compliance alerts and warnings

### 2. Domain Services

#### RuleEngine (`src/services/payroll/RuleEngine.js`)

- Safe formula evaluation (no code execution)
- Dependency resolution using topological sort
- Circular dependency detection
- Deterministic calculations
- Supports: fixed, percentage, formula-based calculations

**Formula Support:**
- Basic math: +, -, *, /, %
- Functions: MIN, MAX, ROUND, FLOOR, CEIL, ABS
- Component references: BASIC, HRA, GROSS, CTC, etc.

**Example Formula:**
```
HRA = MIN(0.5*BASIC, RENT-0.1*BASIC, 50000)
```

#### ComplianceService (`src/services/payroll/ComplianceService.js`)

- Validates basic salary percentage (recommended 40%+)
- Validates PF calculations and caps
- Validates ESI thresholds
- Checks for missing statutory components
- Validates CTC balance

#### StateTaxService (`src/services/payroll/StateTaxService.js`)

- Dynamic professional tax lookup by state
- Supports multiple tax slabs
- Effective date management
- No hardcoding - all slabs in database

### 3. Salary Template System

Templates allow creating multiple salary structures:

- **Full-Time Employees**: Standard structure with all benefits
- **Contract Workers**: Minimal structure
- **Interns**: Reduced structure
- **Sales**: Variable-heavy structure
- **Senior Leadership**: Executive structure

**Template Features:**
- Versioning (never overwrite history)
- Effective date ranges
- Applicable filters (grade, department, designation)
- Auto-balance special allowance option

### 4. Component Types

#### Earnings
- Basic Salary
- HRA
- DA
- Conveyance
- Medical
- Special Allowance
- etc.

#### Deductions
- PF (Employee)
- ESI (Employee)
- Professional Tax
- TDS
- etc.

#### Employer Contributions
- PF (Employer)
- ESI (Employer)
- Gratuity
- Insurance
- etc.

### 5. Calculation Flow

```
1. Load Template
2. Build Dependency Graph
3. Detect Circular Dependencies
4. Topological Sort (evaluation order)
5. Calculate Components (in order)
6. Auto-balance Special Allowance (if enabled)
7. Calculate Gross (sum of earnings)
8. Calculate Deductions
9. Calculate Net (Gross - Deductions)
10. Calculate Employer Contributions
11. Calculate Total Employer Cost
12. Compliance Validation
13. Return Results
```

### 6. Compliance Guardrails

**Warnings Generated:**
- Basic < 40% of CTC
- PF misconfiguration
- ESI threshold breach
- Missing statutory components
- CTC balance mismatch
- Formula errors
- Circular dependencies

**Severity Levels:**
- **Info**: Recommendations
- **Warning**: Should be reviewed
- **Error**: Must be fixed

### 7. Versioning & Audit Trail

**Every Change Tracked:**
- Old CTC → New CTC
- Old Components → New Components
- Changed Components List
- Revision Type (CTC change, template change, etc.)
- Effective Date
- Actor (who made the change)
- Reason

**Never Mutate History:**
- Old templates remain in database
- Salary assignments have effective date ranges
- Complete audit trail for compliance

### 8. Variable Pay Framework

**Supported Types:**
- Performance Bonus
- Joining Bonus
- Retention Bonus
- Quarterly Incentive
- Custom

**Features:**
- Payout frequency (monthly, quarterly, yearly, one-time)
- Calculation basis (percent of CTC/Basic/Gross, fixed, formula)
- Taxable flag
- Linked to cycle flag (affects monthly payroll)

### 9. Professional Tax Engine

**State-Based:**
- No hardcoding
- Dynamic lookup from database
- Supports multiple slabs per state
- Effective date management

**Example (Karnataka):**
- ₹0 if gross ≤ ₹11,000
- ₹150 if gross > ₹11,000 and ≤ ₹15,000
- ₹200 if gross > ₹15,000

### 10. API Endpoints

```
GET    /api/v1/payroll/templates              - List all templates
GET    /api/v1/payroll/templates/:id          - Get template details
POST   /api/v1/payroll/templates              - Create new template
POST   /api/v1/payroll/templates/calculate    - Calculate salary from template
```

## Usage Examples

### Creating a Template

```javascript
POST /api/v1/payroll/templates
{
  "name": "Full-Time Employee",
  "description": "Standard structure for full-time employees",
  "effectiveFrom": "2024-01-01",
  "autoBalanceSpecialAllowance": true,
  "components": [
    {
      "componentName": "Basic Salary",
      "componentCode": "BASIC",
      "componentType": "earning",
      "calculationType": "percent_of_ctc",
      "value": 40,
      "isTaxable": true,
      "affectsPf": true,
      "displayOrder": 1
    },
    {
      "componentName": "HRA",
      "componentCode": "HRA",
      "componentType": "earning",
      "calculationType": "percent_of_basic",
      "value": 50,
      "isTaxable": true,
      "displayOrder": 2
    },
    {
      "componentName": "PF Employee",
      "componentCode": "PF_EMP",
      "componentType": "deduction",
      "calculationType": "formula",
      "formulaExpression": "MIN(0.12*BASIC, 1800)",
      "isStatutory": true,
      "isLocked": true,
      "displayOrder": 10
    }
  ]
}
```

### Calculating Salary

```javascript
POST /api/v1/payroll/templates/calculate
{
  "templateId": 1,
  "ctc": 600000,
  "employeeState": "Karnataka"
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "components": {
      "BASIC": 20000,
      "HRA": 10000,
      "SPECIAL_ALLOWANCE": 8000,
      "GROSS": 38000,
      "PF_EMP": 1800,
      "ESI_EMP": 285,
      "PROFESSIONAL_TAX": 200,
      "NET": 35715
    },
    "earnings": 38000,
    "deductions": 2285,
    "net": 35715,
    "employerContributions": 1800,
    "totalEmployerCost": 621600,
    "compliance": {
      "isValid": true,
      "warnings": []
    }
  }
}
```

## Migration Strategy

### Phase 1: Database Setup
1. Run migration: `create-payroll-engine-tables.cjs`
2. Initialize default Karnataka tax slabs
3. Create default templates

### Phase 2: Integration
1. Update employee form to use templates
2. Add template selection in compensation tab
3. Replace static calculations with rule engine

### Phase 3: Migration
1. Migrate existing employees to templates
2. Create salary assignments for all employees
3. Validate all calculations

## Performance Considerations

- **Calculation Time**: < 200ms per employee
- **Batch Processing**: Supports 10,000+ employees
- **Caching**: Template components cached
- **Database Indexes**: Optimized for lookups

## Security

- **Formula Validation**: No arbitrary code execution
- **Access Control**: Role-based template access
- **Audit Trail**: All changes logged
- **Data Integrity**: Foreign key constraints

## Future Enhancements

- Multi-currency support
- International tax rules
- Advanced formula functions
- Machine learning for salary recommendations
- Integration with tax engines
- Payroll run optimization

## Testing

All calculations are deterministic and testable:

```javascript
// Same inputs = same outputs
const result1 = await RuleEngine.calculateSalary(components, 600000);
const result2 = await RuleEngine.calculateSalary(components, 600000);
assert.deepEqual(result1, result2);
```

## Compliance Notes

- **PF**: Mandatory for 20+ employees
- **ESI**: Applicable if gross ≤ ₹21,000
- **Professional Tax**: Mandatory in most states
- **Gratuity**: Payable after 5 years

All statutory percentages are locked and cannot be changed without admin override.
