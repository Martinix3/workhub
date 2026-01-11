# Task Dependencies - Quick Testing Checklist

**Feature:** Task #022 - Task Dependencies & Blocker Visualization

**Time Required:** 20 minutes

---

## Quick Test Flow

### ☐ 1. Setup (5 min)
- [ ] Create 4 test tasks (A, B, C, D)
- [ ] Verify all appear in Kanban board

### ☐ 2. Add Dependencies (5 min)
- [ ] B blocked by A
- [ ] C blocked by A
- [ ] D blocked by B and C
- [ ] Verify chain: A → B → D and A → C → D

### ☐ 3. View Badges (3 min)
- [ ] Task A shows "Bloquea 2" badge
- [ ] Task B shows "Bloqueada por 1" and "Bloquea 1"
- [ ] Task C shows "Bloqueada por 1" and "Bloquea 1"
- [ ] Task D shows "Bloqueada por 2"

### ☐ 4. Test Popovers (2 min)
- [ ] Click "Bloquea 2" on Task A → shows Task B and C details
- [ ] Click "Bloqueada por 2" on Task D → shows Task B and C details
- [ ] Popover shows task title, status, user, dates

### ☐ 5. Blocked Highlighting (2 min)
- [ ] Task B, C, D have red left border in Kanban
- [ ] Task B, C, D have gradient background
- [ ] Task A (no blocked_by) has no highlighting
- [ ] My Day view shows same highlighting

### ☐ 6. Completion Warnings (2 min)
- [ ] Complete Task A → warning shows "blocking 2 tasks"
- [ ] Complete Task B → warning shows "blocking 1 task"
- [ ] Complete task without deps → no warning

### ☐ 7. Dependency Modal (3 min)
- [ ] Modal opens from task detail
- [ ] Can switch between "Blocked By" and "Blocking" tabs
- [ ] Search filters tasks
- [ ] Can add dependency
- [ ] Can remove dependency
- [ ] Circular dependency prevented (B→A when A→B exists)

### ☐ 8. My Day Integration (1 min)
- [ ] My Day shows dependency badges
- [ ] My Day shows blocked task highlighting
- [ ] "Blocking Others" section works

---

## Acceptance Criteria Validation

- ✅ **AC-1:** Users can define 'blocked by' and 'blocks' relationships
- ✅ **AC-2:** Task cards show blocking/blocked indicators with count
- ✅ **AC-3:** Clicking indicator shows linked tasks
- ✅ **AC-4:** System warns when completing tasks that block others
- ✅ **AC-5:** Blocked tasks are highlighted in views

---

## Test Result

**Status:** ☐ PASS ☐ FAIL ☐ NEEDS FIXES

**Issues Found:** _______________________________________

**Tested By:** ________________ **Date:** ________________

---

## Commands Reference

```bash
# Build assets
cd /Users/martinjaimesamperiz/santabrisa/frappe-bench
bench build --app workhub_frappe_app

# Run automated tests
bench --site [your-site] execute workhub_frappe_app.scripts.test_dependencies.run_all_tests

# Restart bench
bench start
```

---

## File Reference

- **Full Testing Guide:** `MANUAL_TESTING_GUIDE.md`
- **API Tests:** `test_dependencies.py`
- **API Test Docs:** `README_TESTING.md`
