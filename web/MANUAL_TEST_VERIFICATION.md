# HACCP Reading Modal - Manual Test Verification

**Test Date:** 2026-01-11
**Subtask:** 4.1 - Verify modal works correctly with sample HACCP plans
**Tester:** Auto-Claude

## Test Environment

- **Mode:** Bypass Mode (uses sample data)
- **Sample HACCP Plans:** 1 plan with 2 CCPs
  - CCP1: Fermentacion - Temperatura (Critical Limit: 25-32°C)
  - CCP2: Destilacion - Alcohol (Critical Limit: 45-55%)

## Acceptance Criteria

- [ ] Modal opens from any CCP card
- [ ] Validation shows correct status for different values
- [ ] Corrective action field appears for out-of-range values
- [ ] Form submission works in bypass mode

---

## Test Cases

### TC1: Modal Opens from CCP Cards

**Steps:**
1. Navigate to HACCP Monitor page
2. Click "Registrar Lectura" button on CCP1 (Fermentacion - Temperatura)
3. Verify modal opens with correct CCP information
4. Close modal
5. Click "Registrar Lectura" button on CCP2 (Destilacion - Alcohol)
6. Verify modal opens with correct CCP information

**Expected Results:**
- ✅ Modal opens when clicking "Registrar Lectura" on any CCP
- ✅ Modal displays correct CCP name and hazard type
- ✅ Modal displays correct critical limit
- ✅ Modal title is "Registrar Lectura HACCP"

**Status:** PENDING

---

### TC2: Validation for Within-Range Values (CCP1 - Temperature)

**Critical Limit:** 25-32°C

**Test Values:**
| Value | Expected Status | Expected Border Color | Expected Message |
|-------|----------------|----------------------|------------------|
| 25 | Normal | Green | ✓ Dentro del límite crítico |
| 28.5 | Normal | Green | ✓ Dentro del límite crítico |
| 32 | Normal | Green | ✓ Dentro del límite crítico |
| 28.5 C | Normal | Green | ✓ Dentro del límite crítico |
| 28.5°C | Normal | Green | ✓ Dentro del límite crítico |

**Steps:**
1. Open modal for CCP1
2. Enter each value above
3. Observe input border color and status message

**Expected Results:**
- ✅ Input field has green border
- ✅ Green checkmark (✓) appears
- ✅ Message shows "Dentro del límite crítico"
- ✅ Help text shows "Rango aceptable: 25 - 32 °C"
- ✅ No corrective action field appears

**Status:** PENDING

---

### TC3: Validation for Out-of-Range Values (CCP1 - Temperature)

**Critical Limit:** 25-32°C

**Test Values:**
| Value | Expected Status | Expected Border Color | Expected Message |
|-------|----------------|----------------------|------------------|
| 20 | Critical | Red | ⚠ Fuera del límite crítico - Se requiere acción correctiva |
| 24.9 | Critical | Red | ⚠ Fuera del límite crítico - Se requiere acción correctiva |
| 32.1 | Critical | Red | ⚠ Fuera del límite crítico - Se requiere acción correctiva |
| 35 | Critical | Red | ⚠ Fuera del límite crítico - Se requiere acción correctiva |

**Steps:**
1. Open modal for CCP1
2. Enter each value above
3. Observe input border color and status message
4. Verify corrective action field appears

**Expected Results:**
- ✅ Input field has red border
- ✅ Red warning icon (⚠) appears
- ✅ Message shows "Fuera del límite crítico - Se requiere acción correctiva"
- ✅ Corrective action textarea appears with red theme
- ✅ Corrective action field is marked as mandatory (Obligatoria)
- ✅ Predefined corrective action is shown as reference
- ✅ Submit button is disabled until corrective action is entered

**Status:** PENDING

---

### TC4: Validation for Within-Range Values (CCP2 - Alcohol %)

**Critical Limit:** 45-55%

**Test Values:**
| Value | Expected Status | Expected Border Color | Expected Message |
|-------|----------------|----------------------|------------------|
| 45 | Normal | Green | ✓ Dentro del límite crítico |
| 48 | Normal | Green | ✓ Dentro del límite crítico |
| 55 | Normal | Green | ✓ Dentro del límite crítico |
| 48% | Normal | Green | ✓ Dentro del límite crítico |
| 50.5 | Normal | Green | ✓ Dentro del límite crítico |

**Expected Results:**
- ✅ Input field has green border for all valid values
- ✅ Validation works with or without % unit in input
- ✅ Help text shows "Rango aceptable: 45 - 55 %"

**Status:** PENDING

---

### TC5: Validation for Out-of-Range Values (CCP2 - Alcohol %)

**Critical Limit:** 45-55%

**Test Values:**
| Value | Expected Status | Expected Border Color | Expected Message |
|-------|----------------|----------------------|------------------|
| 40 | Critical | Red | ⚠ Fuera del límite crítico - Se requiere acción correctiva |
| 44.9 | Critical | Red | ⚠ Fuera del límite crítico - Se requiere acción correctiva |
| 55.1 | Critical | Red | ⚠ Fuera del límite crítico - Se requiere acción correctiva |
| 60 | Critical | Red | ⚠ Fuera del límite crítico - Se requiere acción correctiva |

**Expected Results:**
- ✅ Input field has red border for all out-of-range values
- ✅ Corrective action field appears
- ✅ Submit button is disabled until corrective action is entered

**Status:** PENDING

---

### TC6: Form Submission - Normal Reading

**Steps:**
1. Open modal for CCP1 (Temperature)
2. Enter value: "28"
3. Enter lot number (optional): "LOT-2026-001"
4. Click "Guardar Lectura"

**Expected Results:**
- ✅ Submit button is enabled
- ✅ Button text changes to "Guardando..." during submission
- ✅ No corrective action required
- ✅ In bypass mode: API call will fail gracefully
- ✅ Modal handles submission attempt

**Status:** PENDING

---

### TC7: Form Submission - Critical Reading with Corrective Action

**Steps:**
1. Open modal for CCP1 (Temperature)
2. Enter value: "20"
3. Verify corrective action field appears
4. Try to submit without corrective action
5. Enter corrective action: "Ajusté temperatura del tanque de fermentación a 27°C"
6. Enter lot number (optional): "LOT-2026-001"
7. Click "Guardar Lectura"

**Expected Results:**
- ✅ Submit button is disabled when corrective action is empty
- ✅ Submit button is enabled after entering corrective action
- ✅ Button shows "Guardando..." during submission
- ✅ Modal handles submission attempt

**Status:** PENDING

---

### TC8: Form Reset and Close

**Steps:**
1. Open modal
2. Enter some values in the form
3. Close modal using "Cancelar" button
4. Reopen modal
5. Verify form is empty

**Expected Results:**
- ✅ Form resets when modal closes
- ✅ Cancel button works correctly
- ✅ Modal can be reopened successfully

**Status:** PENDING

---

### TC9: Loading State

**Steps:**
1. Open modal
2. Enter valid value
3. Submit form
4. Observe button state during submission

**Expected Results:**
- ✅ Submit button shows "Guardando..." during submission
- ✅ Submit button is disabled during submission
- ✅ All inputs are disabled during submission
- ✅ Cancel button is disabled during submission

**Status:** PENDING

---

## Test Execution Notes

### How to Run Tests

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Enable bypass mode:**
   - Open browser DevTools
   - Go to Console
   - Run: `sessionStorage.setItem('auth_bypass', 'true')`
   - Refresh page
   - Click "Bypass Auth" button on login page

3. **Navigate to HACCP Monitor:**
   - Click "Producción y Calidad" in navigation
   - Select "Monitor HACCP" tab

4. **Run test cases:**
   - Follow each test case above
   - Mark results as PASS/FAIL
   - Document any issues found

---

## Test Results Summary

**Total Test Cases:** 9
**Passed:** 0
**Failed:** 0
**Blocked:** 0
**Not Executed:** 9

---

## Issues Found

_No issues found yet - testing pending_

---

## Sign-off

**Tested by:** [Pending]
**Date:** [Pending]
**Status:** PENDING EXECUTION
