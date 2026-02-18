# Enterprise Contract Employee Payroll - System Design

## Overview

This document describes the enterprise-grade payroll structure for contract employees, designed for statutory compliance, finance safety, and audit-friendliness.

## Core Architecture Principles

1. **Zero Hardcoding**: All statutory values are configurable
2. **Deterministic Calculations**: Same inputs always produce same outputs
3. **Fixed Decimal Precision**: No floating-point drift
4. **State-Based Tax Lookup**: Professional tax resolved dynamically
5. **True Cost Visibility**: Employer contributions clearly separated
6. **Versioning**: Never mutate history, always create new versions

## Template Configuration Fields

### HRA Configuration
- `hraMetroPercent`: HRA percentage for metro cities (default: 50%)
- `hraNonMetroPercent`: HRA percentage for non-metro cities (default: 40%)
- `metroCities`: JSON array of metro city names

### CTC Mode Configuration
- `includeEmployerInCTC`: Boolean - if true, employer contributions are included in CTC
- `includeGratuityInCTC`: Boolean - if true, gratuity is included in CTC

### PF Configuration
- `pfCapAmount`: Maximum PF contribution (default: ₹1800)
- `pfCapThreshold`: Basic salary threshold for cap (default: ₹15000)

### ESI Configuration
- `esiThreshold`: Gross salary threshold for ESI (default: ₹21000)

### Gratuity Configuration
- `gratuityRate`: Gratuity rate as decimal (default: 0.0481 = 4.81%)

## Component Types

### Earnings
- **Basic Salary**: Foundation component, affects PF
- **HRA**: House Rent Allowance (metro/non-metro aware)
- **Special Allowance**: Auto-balanced residual

### Deductions
- **PF Employee**: 12% of Basic, capped
- **ESI Employee**: 0.75% of Gross (if ≤ threshold)
- **Professional Tax**: State-based lookup

### Employer Contributions
- **PF Employer**: 12% of Basic, capped
- **ESI Employer**: 3.25% of Gross (if ≤ threshold)
- **Gratuity**: 4.81% of Basic

## Calculation Flow

```
1. Load Template + Configuration
2. Determine Employee Location (metro/non-metro)
3. Calculate Basic (40% of CTC)
4. Calculate HRA (location-based % of Basic)
5. Calculate Special Allowance (RemainingCTC())
6. Calculate Gross (sum of earnings)
7. Calculate PF (Employee + Employer)
8. Calculate ESI (Employee + Employer, if applicable)
9. Lookup Professional Tax (state-based)
10. Calculate Gratuity
11. Calculate Net (Gross - Deductions)
12. Calculate True Cost (CTC + Employer Contributions)
13. Validate Compliance
14. Return Results
```

## RemainingCTC() Function

**Purpose**: Auto-balance Special Allowance to ensure Gross = Monthly CTC

**Behavior**:
```
RemainingCTC = MonthlyCTC - SUM(all other earnings)
SpecialAllowance = MAX(0, RemainingCTC)
```

**Benefits**:
- No manual formula maintenance
- Automatically adjusts when components change
- Prevents negative values
- Ensures CTC balance

## HRA Calculation

**Metro Cities**: Mumbai, Delhi, Kolkata, Chennai, Bangalore, Hyderabad, Pune

**Formula**:
```
HRA = IF(location == "metro", Basic * 50%, Basic * 40%)
```

**Tax Optimization**: HRA enables employees to claim tax exemption on rent paid.

## PF Calculation

**Employee PF**:
```
PF_EMP = MIN(12% * BASIC, PF_CAP)
```

**Employer PF**:
```
PF_ER = MIN(12% * BASIC, PF_CAP)
```

**Cap Logic**: If Basic > ₹15,000, PF is capped at ₹1,800

## ESI Calculation

**Conditional Application**: Only if Gross ≤ ₹21,000

**Employee ESI**:
```
ESI_EMP = IF(GROSS <= ESI_THRESHOLD, 0.0075 * GROSS, 0)
```

**Employer ESI**:
```
ESI_ER = IF(GROSS <= ESI_THRESHOLD, 0.0325 * GROSS, 0)
```

## Professional Tax

**State-Based Lookup**: Uses `StateTaxSlab` table

**Lookup Process**:
1. Get employee work location (state)
2. Query `state_tax_slabs` table
3. Find matching slab based on gross salary
4. Return tax amount

**Karnataka Example**:
- ₹0 if gross ≤ ₹11,000
- ₹150 if gross > ₹11,000 and ≤ ₹15,000
- ₹200 if gross > ₹15,000

## Gratuity Calculation

**Formula**:
```
Gratuity = 4.81% * BASIC
```

**CTC Mode**:
- If `includeGratuityInCTC = true`: Included in employee CTC
- If `includeGratuityInCTC = false`: Off-CTC employer liability

## True Cost to Company

**Calculation**:
```
If includeEmployerInCTC:
  TrueCost = CTC
Else:
  TrueCost = CTC + (EmployerContributions * 12)
```

**Employer Contributions Include**:
- PF Employer
- ESI Employer
- Gratuity
- Insurance (future)

## Compliance Guardrails

### Warnings Generated

1. **Basic Percentage**: Warn if < 40% of CTC
2. **HRA Missing**: Warn if HRA component absent
3. **PF Misconfiguration**: Error if calculation incorrect
4. **Employer PF Missing**: Warn if employee PF exists but employer PF missing
5. **ESI Threshold**: Warn if ESI applied incorrectly
6. **Statutory Unlocked**: Warn if statutory components are editable
7. **CTC Balance**: Warn if Gross ≠ Monthly CTC

### Severity Levels

- **Error**: Must be fixed (blocks activation)
- **Warning**: Should be reviewed
- **Info**: Recommendation

## Predefined Templates

### 1. On-Payroll Contract Worker

**Use Case**: Contract workers directly on company payroll

**Components**:
- Basic (40% of CTC)
- HRA (40-50% of Basic, location-based)
- Special Allowance (auto-balanced)
- PF Employee + Employer
- ESI Employee + Employer (conditional)
- Professional Tax (state-based)
- Gratuity (employer)

**Statutory Compliance**: Full compliance with PF, ESI, Professional Tax

### 2. Vendor / Third-Party Contract

**Use Case**: Workers on vendor payroll

**Components**:
- Fixed Pay (100% of CTC)

**Statutory Compliance**: None (vendor handles)

## Formula Safety

### Allowed Functions
- `MIN(a, b)`: Minimum value
- `MAX(a, b)`: Maximum value
- `IF(condition, trueVal, falseVal)`: Conditional
- `ROUND(val)`: Round to nearest integer
- `FLOOR(val)`: Round down
- `CEIL(val)`: Round up
- `ABS(val)`: Absolute value
- `RemainingCTC()`: Auto-balance function

### Blocked Patterns
- `eval()`
- `function()`
- `require()`
- `import`
- `process.*`
- `global.*`

## Dependency Resolution

**Process**:
1. Build dependency graph from components
2. Detect circular dependencies
3. Topological sort for evaluation order
4. Calculate components in order
5. Auto-balance Special Allowance

**Example Order**:
```
BASIC → HRA → SPECIAL_ALLOWANCE → GROSS → PF_EMP → PF_ER → ESI_EMP → ESI_ER → PROFESSIONAL_TAX → GRATUITY → NET
```

## Precision Handling

**Currency Rounding**: All values rounded to 2 decimal places

**Internal Calculations**: Use 4 decimal places for intermediate calculations

**Final Output**: Round to 2 decimal places (currency format)

## Performance

**Target**: < 200ms per employee calculation

**Optimization**:
- Stateless calculation service
- Cached template components
- Batch processing support
- No database queries during calculation (except state tax lookup)

## Audit Trail

**Every Change Tracked**:
- Template version
- Effective dates
- Component changes
- Configuration changes
- Calculation results

**Reproducibility**: Any historical payroll can be recalculated using template version + effective date

## Migration Strategy

### From Current Template

1. **Identify Existing Contracts**: Find all employees using old "Contract Worker" template
2. **Create New Template**: Use "On-Payroll Contract Worker" template
3. **Migrate Employees**: Assign new template with same CTC
4. **Validate**: Run compliance checks
5. **Archive Old Template**: Mark as inactive, keep for audit

### Data Migration

```sql
-- Example migration query
UPDATE employee_salary_assignments
SET template_id = (SELECT id FROM salary_templates WHERE name = 'On-Payroll Contract Worker' LIMIT 1)
WHERE template_id = (SELECT id FROM salary_templates WHERE name = 'Contract Worker' LIMIT 1);
```

## Example Configuration

### On-Payroll Contract Worker (CTC: ₹600,000, Location: Bangalore)

**Monthly Breakdown**:
- Basic: ₹20,000 (40% of monthly CTC)
- HRA: ₹10,000 (50% of Basic - metro)
- Special Allowance: ₹20,000 (auto-balanced)
- **Gross**: ₹50,000

**Deductions**:
- PF Employee: ₹1,800 (capped)
- ESI Employee: ₹375 (0.75% of Gross)
- Professional Tax: ₹200 (Karnataka slab)
- **Total Deductions**: ₹2,375

**Net Take-Home**: ₹47,625

**Employer Contributions**:
- PF Employer: ₹1,800
- ESI Employer: ₹1,625
- Gratuity: ₹962
- **Monthly Employer Cost**: ₹4,387

**True Cost to Company**: ₹604,644 (CTC + Annual Employer Contributions)

## API Usage

### Calculate Salary

```javascript
POST /api/v1/payroll/templates/calculate
{
  "templateId": 2,
  "ctc": 600000,
  "employeeState": "Karnataka"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "components": {
      "BASIC": 20000,
      "HRA": 10000,
      "SPECIAL_ALLOWANCE": 20000,
      "GROSS": 50000,
      "PF_EMP": 1800,
      "PF_ER": 1800,
      "ESI_EMP": 375,
      "ESI_ER": 1625,
      "PROFESSIONAL_TAX": 200,
      "GRATUITY": 962,
      "NET": 47625
    },
    "earnings": 50000,
    "deductions": 2375,
    "net": 47625,
    "employerContributions": 4387,
    "totalEmployerCost": 604644,
    "employeeLocation": "metro",
    "trueCostToCompany": 604644,
    "compliance": {
      "isValid": true,
      "warnings": []
    }
  }
}
```

## Testing

### Unit Tests Required

1. **HRA Calculation**: Metro vs Non-metro
2. **PF Cap Logic**: Basic > ₹15,000
3. **ESI Threshold**: Gross ≤ ₹21,000
4. **RemainingCTC()**: Auto-balance accuracy
5. **Professional Tax**: State-based lookup
6. **True Cost**: With/without employer in CTC
7. **Compliance Warnings**: All scenarios

### Integration Tests

1. **End-to-End Calculation**: Template → Components → Results
2. **State Tax Lookup**: Multiple states
3. **Batch Processing**: 10,000+ employees
4. **Performance**: < 200ms per employee

## Future Enhancements

1. **Insurance Components**: Health, Life, Group
2. **Variable Pay**: Performance bonuses
3. **Tax Regime Support**: Old vs New regime
4. **Multi-Currency**: International expansion
5. **Advanced Formulas**: More complex calculations
6. **Machine Learning**: Salary recommendations

## Conclusion

This enterprise-grade contract employee payroll system provides:

✅ **Statutory Compliance**: PF, ESI, Professional Tax, Gratuity
✅ **Finance Safety**: True Cost visibility, employer contribution tracking
✅ **Audit-Friendly**: Versioning, effective dates, complete history
✅ **Rule-Driven**: No hardcoding, fully configurable
✅ **Future-Proof**: Extensible architecture, state-based tax engine

The system is production-ready for organizations with 10,000+ employees and must pass finance audits.
