# Cursor Prompt: Sync Compensation Configuration with Employees Page

You are a senior frontend engineer working on an HR SaaS application. Your task is to ensure that the `/employees` page auto-fills compensation fields using values from the `/compensation-config` page stored in localStorage.

## Current Problem

The `/employees` page has a `getCompensationConfig()` function that reads from `localStorage.getItem('compensationConfig')`, but there are critical issues:

1. **0 Value Bug**: The code uses `||` operator which treats `0` as falsy, causing `0` values from config to be replaced with defaults (e.g., `config.conveyanceFixed || 1600` will use 1600 even if config has 0)
2. **Inconsistent Auto-fill**: Auto-fill logic doesn't properly respect config values when fields are empty
3. **Missing Config Usage**: Some calculations may not be using all config values correctly

## Requirements

### 1. Fix `getCompensationConfig()` Function

**File**: `src/views/employees.hbs` (around line 2192)

**Current Code**:
```javascript
function getCompensationConfig() {
  const defaultConfig = {
    basicSalaryPercent: 40,
    hraPercent: 50,
    daPercent: 0,
    conveyanceFixed: 1600,
    medicalFixed: 1250,
    // ... other defaults
  };
  
  try {
    const saved = localStorage.getItem('compensationConfig');
    if (saved) {
      return { ...defaultConfig, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading compensation config:', e);
  }
  
  return defaultConfig;
}
```

**Issue**: The spread operator merge is correct, but downstream code uses `||` which breaks 0 values.

**Action**: The function itself is fine, but ensure it's used correctly downstream.

### 2. Fix `calculateFromCTCBasic()` Function

**File**: `src/views/employees.hbs` (around line 2258)

**Current Problem Code** (lines 2284, 2290, 2297, 2303):
```javascript
conveyance = config.conveyanceFixed || 1600;  // ❌ BUG: 0 becomes 1600
medical = config.medicalFixed || 1250;        // ❌ BUG: 0 becomes 1250
```

**Required Fix**:
```javascript
// Fixed allowances - use config values (allow 0)
const conveyance = config.conveyanceFixed !== undefined ? config.conveyanceFixed : 1600;
const medical = config.medicalFixed !== undefined ? config.medicalFixed : 1250;
```

**Location**: Replace all instances in `calculateFromCTCBasic()` function where `config.conveyanceFixed || 1600` and `config.medicalFixed || 1250` are used.

### 3. Verify `calculateCompensation()` Uses Config

**File**: `src/views/employees.hbs` (around line 2470)

**Check**: Ensure all config values are used correctly:
- `config.enablePF` - for PF calculation
- `config.enableESI` - for ESI calculation
- `config.enableProfessionalTax` - for professional tax
- `config.enableGratuity` - for gratuity
- `config.pfCapThreshold` - for PF cap logic
- `config.pfMaxContribution` - for PF max amount
- `config.esiThreshold` - for ESI threshold

**Action**: Review the function and ensure it uses `config` object from `getCompensationConfig()` correctly. Fix any `||` operators that might break 0 values.

### 4. Ensure Auto-fill Logic Respects Config

**File**: `src/views/employees.hbs` (around line 2320)

**Current Logic**: The auto-fill logic checks if field is empty before filling. This is correct, but ensure it uses config values properly.

**Verify**: When fields are empty, they should be filled with values from `getCompensationConfig()`, including 0 values.

## Implementation Steps

1. **Fix 0 Value Handling in `calculateFromCTCBasic()`**:
   - Replace `config.conveyanceFixed || 1600` with `config.conveyanceFixed !== undefined ? config.conveyanceFixed : 1600`
   - Replace `config.medicalFixed || 1250` with `config.medicalFixed !== undefined ? config.medicalFixed : 1250`
   - Apply same fix to any other config values using `||` operator

2. **Review `calculateCompensation()` Function**:
   - Ensure all config values are accessed correctly
   - Fix any `||` operators that might treat 0 as falsy
   - Verify PF, ESI, Professional Tax, and Gratuity calculations use config flags

3. **Test Edge Cases**:
   - Set Conveyance to 0 in compensation-config → Verify employees page uses 0
   - Set Medical to 0 in compensation-config → Verify employees page uses 0
   - Change Basic % to 45% → Verify employees page uses 45%
   - Change HRA % to 40% → Verify employees page uses 40%
   - Disable PF → Verify employees page doesn't calculate PF

## Data Flow

```
Compensation Config Page (/compensation-config)
    ↓ (saves to)
localStorage['compensationConfig'] = { conveyanceFixed: 0, medicalFixed: 0, ... }
    ↓ (read by)
Employees Page getCompensationConfig()
    ↓ (used in)
calculateFromCTCBasic(ctc) → Auto-fills fields with config values
calculateCompensation() → Calculates deductions using config flags
```

## Key Principles

1. **Preserve 0 Values**: Use `!== undefined` checks, not `||` operators
2. **Respect User Input**: If user manually enters a value (including 0), keep it
3. **Auto-fill from Config**: When fields are empty, use config values
4. **Consistent Behavior**: Both pages should use same localStorage structure

## Files to Modify

- `src/views/employees.hbs`
  - Fix `calculateFromCTCBasic()` function (line ~2258)
  - Review `calculateCompensation()` function (line ~2470)
  - Ensure all config value accesses handle 0 correctly

## Expected Behavior After Fix

1. User sets Conveyance = 0 in `/compensation-config` and saves
2. User goes to `/employees` and enters CTC
3. Conveyance field auto-fills with 0 (not 1600)
4. User sets Medical = 0 in `/compensation-config` and saves
5. User goes to `/employees` and enters CTC
6. Medical field auto-fills with 0 (not 1250)
7. All other config values (percentages, thresholds, flags) work correctly

## Testing Checklist

- [ ] Set Conveyance to 0 in compensation-config → Employees page uses 0
- [ ] Set Medical to 0 in compensation-config → Employees page uses 0
- [ ] Change Basic % to 45% → Employees page uses 45%
- [ ] Change HRA % to 40% → Employees page uses 40%
- [ ] Change DA % to 10% → Employees page uses 10%
- [ ] Disable PF → Employees page doesn't calculate PF
- [ ] Disable ESI → Employees page doesn't calculate ESI
- [ ] Change PF cap to 2000 → Employees page uses 2000
- [ ] Change ESI threshold to 25000 → Employees page uses 25000

## Important Notes

- Do NOT remove existing functionality
- Do NOT change route names or API calls
- Do NOT modify the compensation-config page (it's already correct)
- Only fix the employees page to properly read and use config values
- Maintain backward compatibility with existing localStorage data
