# Manual Integration Testing Guide
## Task Dependencies & Blocker Visualization (Task #022)

**Purpose:** Validate the complete user flow for task dependencies and blocker visualization across all views.

**Estimated Time:** 20 minutes

**Prerequisites:**
- Frappe/ERPNext environment running
- WorkHub app installed with all changes from Phase 1-4
- Access to a test project with ability to create tasks
- Assets built: `bench build --app workhub_frappe_app`

---

## Test Flow Overview

This guide walks through the complete dependency management flow:
1. ✅ Setup: Create test tasks
2. ✅ Add dependencies between tasks
3. ✅ View dependency badges in Kanban view
4. ✅ View dependency popovers
5. ✅ Test blocked task highlighting
6. ✅ Complete blocking tasks and verify warnings
7. ✅ Test dependency modal UI
8. ✅ Verify My Day view integration

---

## 1. Setup: Create Test Tasks

**Objective:** Create 4 tasks to test dependency relationships

### Steps:
1. Navigate to a WorkHub project (or create a new one)
2. Create the following tasks:

   **Task A: "Setup Database"**
   - Status: NEXT
   - Priority: P1
   - Assigned to: Yourself

   **Task B: "Build API"**
   - Status: NEXT
   - Priority: P1
   - Assigned to: Yourself

   **Task C: "Create UI"**
   - Status: NEXT
   - Priority: P2
   - Assigned to: Yourself

   **Task D: "Deploy to Production"**
   - Status: BACKLOG
   - Priority: P0
   - Assigned to: Yourself

### Expected Result:
- ✅ 4 tasks created successfully
- ✅ All tasks visible in Kanban board

### Notes:
Record task IDs here for reference:
- Task A ID: `___________`
- Task B ID: `___________`
- Task C ID: `___________`
- Task D ID: `___________`

---

## 2. Add Dependencies Between Tasks

**Objective:** Create dependency chain: A → B → D and A → C → D

### Steps:

#### 2.1 Add Dependency: B is blocked by A
1. Open Task B detail view
2. Look for the "Dependencies" section
3. Click **"Manage Dependencies"** button
4. Modal should open with Task B title
5. Switch to **"Blocked By"** tab (if not already)
6. In the search box, type "Setup Database" (Task A)
7. Click **"Add Dependency"** button for Task A
8. Verify Task A appears in "Current Dependencies" list
9. Close modal

**Expected Result:**
- ✅ Modal opens successfully
- ✅ Task search works and shows Task A
- ✅ Dependency added successfully
- ✅ Success message displayed
- ✅ Task A appears in dependencies list

#### 2.2 Add Dependency: C is blocked by A
1. Open Task C detail view
2. Click **"Manage Dependencies"**
3. Switch to **"Blocked By"** tab
4. Search for Task A
5. Add dependency
6. Close modal

**Expected Result:**
- ✅ Dependency added successfully
- ✅ Task A appears in Task C's blocked by list

#### 2.3 Add Dependency: D is blocked by B and C
1. Open Task D detail view
2. Click **"Manage Dependencies"**
3. Switch to **"Blocked By"** tab
4. Search and add Task B
5. Search and add Task C
6. Verify both appear in dependencies list
7. Close modal

**Expected Result:**
- ✅ Both dependencies added successfully
- ✅ Task D shows 2 items in "Blocked By" list

#### 2.4 Verify Dependency Chain
Navigate back to each task and verify:
- Task A: Should show "Blocks: 2" (Task B, Task C)
- Task B: Should show "Blocked By: 1" and "Blocks: 1"
- Task C: Should show "Blocked By: 1" and "Blocks: 1"
- Task D: Should show "Blocked By: 2" (Task B, Task C)

**Expected Result:**
- ✅ All dependency counts are correct
- ✅ Dependency relationships are bidirectional

---

## 3. View Dependency Badges in Kanban View

**Objective:** Verify badges appear on task cards in Kanban board

### Steps:
1. Navigate to the Kanban board view
2. Look at each task card

**Expected Results:**

### Task A Card:
- ✅ Shows **"Bloquea 2"** badge (orange/yellow)
- ✅ Badge has correct styling (rounded, colored background)
- ✅ No "Bloqueada por" badge

### Task B Card:
- ✅ Shows **"Bloqueada por 1"** badge (red)
- ✅ Shows **"Bloquea 1"** badge (orange/yellow)
- ✅ Both badges visible and styled correctly

### Task C Card:
- ✅ Shows **"Bloqueada por 1"** badge (red)
- ✅ Shows **"Bloquea 1"** badge (orange/yellow)

### Task D Card:
- ✅ Shows **"Bloqueada por 2"** badge (red)
- ✅ No "Bloquea" badge

### General Badge Validation:
- ✅ Badges appear on all task cards with dependencies
- ✅ Badge colors are distinct (red for blocked, orange/yellow for blocking)
- ✅ Badge text is readable
- ✅ Badges are positioned correctly on cards

---

## 4. View Dependency Popovers

**Objective:** Verify clicking badges shows detailed popover with task info

### Steps:

#### 4.1 Test "Blocks" Popover (Task A)
1. Find Task A card in Kanban view
2. Click the **"Bloquea 2"** badge
3. Popover should appear

**Expected Results:**
- ✅ Popover appears near the badge
- ✅ Shows "Blocking 2 tasks" header
- ✅ Lists Task B and Task C
- ✅ Each task shows:
  - Task title
  - Task ID (WH-TASK-XXXXX)
  - Status badge
  - Assigned user name
  - Due date (if set)
  - Priority
- ✅ Popover has proper styling (shadow, border, background)
- ✅ Clicking outside closes popover

#### 4.2 Test "Blocked By" Popover (Task D)
1. Find Task D card in Kanban view
2. Click the **"Bloqueada por 2"** badge
3. Popover should appear

**Expected Results:**
- ✅ Popover appears near the badge
- ✅ Shows "Blocked by 2 tasks" header
- ✅ Lists Task B and Task C
- ✅ Each task shows complete info
- ✅ Task info is accurate and up-to-date
- ✅ Clicking outside closes popover

#### 4.3 Test Popover Data Accuracy
Verify the popover data matches the actual task data:
- ✅ Task titles are correct
- ✅ Status badges show current status
- ✅ Assigned users are correct
- ✅ Dates are accurate

---

## 5. Test Blocked Task Highlighting

**Objective:** Verify blocked tasks are visually highlighted

### Steps:

#### 5.1 Kanban Board View
1. Navigate to Kanban board
2. Observe Task B, C, and D (all have blocked_by dependencies)

**Expected Results:**
- ✅ Task B has red left border
- ✅ Task B has gradient background (red tint)
- ✅ Task B shows warning icon or visual indicator
- ✅ Task C has same visual highlighting
- ✅ Task D has same visual highlighting
- ✅ Task A (no blocked_by) does NOT have highlighting
- ✅ Highlighting is subtle but noticeable
- ✅ Pulse animation may be present

#### 5.2 My Day View
1. Assign Task B and Task C to yourself with today's date
2. Navigate to **My Day** view
3. Look at the task cards in "Tasks for Today" section

**Expected Results:**
- ✅ Task B shows blocked highlighting (red border, gradient)
- ✅ Task C shows blocked highlighting
- ✅ Warning icon appears in top-right corner
- ✅ Dependency badges appear ("Bloqueada por 1", "Bloquea 1")
- ✅ Tasks without dependencies don't have highlighting

---

## 6. Complete Blocking Tasks with Warnings

**Objective:** Verify system warns when completing tasks that block others

### Steps:

#### 6.1 Try to Complete Task A (blocks 2 tasks)
1. Navigate to Kanban board
2. Try to drag Task A to "DONE" column
   - OR change status to DONE in task detail
3. Observe the response

**Expected Results:**
- ✅ Warning message appears
- ✅ Message says something like: "This task is blocking 2 other tasks: Setup Database, Build API"
- ✅ Shows up to 3 task titles in warning
- ✅ Task status still changes to DONE (warning is informational)
- ✅ Warning is displayed clearly (toast/alert/dialog)

#### 6.2 Try to Complete Task B (blocks 1 task)
1. Try to complete Task B
2. Observe warning

**Expected Results:**
- ✅ Warning message appears
- ✅ Message mentions Task D (the task being blocked)
- ✅ Task completes successfully with warning

#### 6.3 Complete Task Without Dependencies
1. Create a new task with no dependencies
2. Complete it

**Expected Results:**
- ✅ No warning appears
- ✅ Task completes normally

---

## 7. Test Dependency Modal UI

**Objective:** Verify dependency management modal functionality

### Steps:

#### 7.1 Open Modal from Task Detail
1. Open any task detail view
2. Click **"Manage Dependencies"** button

**Expected Results:**
- ✅ Modal opens with backdrop
- ✅ Modal shows task title at top
- ✅ Type selector shows "Blocked By" and "Blocking" tabs
- ✅ Current dependencies section is visible
- ✅ Add dependency section is visible
- ✅ Modal is styled correctly (Neobrutalismo design)
- ✅ Modal is responsive

#### 7.2 Switch Between Dependency Types
1. Click **"Blocking"** tab
2. Observe changes
3. Click **"Blocked By"** tab
4. Observe changes

**Expected Results:**
- ✅ Tabs switch smoothly
- ✅ Current dependencies update to show correct type
- ✅ Search results update for correct type
- ✅ Active tab is visually highlighted

#### 7.3 Search for Tasks
1. In the search box, type partial task name
2. Observe results (should debounce 300ms)

**Expected Results:**
- ✅ Search filters task list
- ✅ Results update as you type (with debounce)
- ✅ Matching tasks appear in list
- ✅ Non-matching tasks are hidden
- ✅ Clear search shows all tasks again

#### 7.4 Add Dependency
1. Search for a task not yet in dependencies
2. Click **"Add Dependency"** button

**Expected Results:**
- ✅ Loading state appears briefly
- ✅ Success message appears
- ✅ Task moves to "Current Dependencies" section
- ✅ Task disappears from available tasks list
- ✅ Add button becomes disabled/hidden for that task
- ✅ Counter updates (if visible)

#### 7.5 Remove Dependency
1. In "Current Dependencies" list, find a dependency
2. Click the **"Remove"** or **"✕"** button

**Expected Results:**
- ✅ Confirmation may appear (optional)
- ✅ Dependency is removed from list
- ✅ Task appears back in available tasks
- ✅ Success message appears
- ✅ Counter updates

#### 7.6 Test Circular Dependency Prevention
1. Create dependency: A → B
2. Try to create dependency: B → A (circular)

**Expected Results:**
- ✅ Error message appears
- ✅ Message says "Circular dependency detected" or similar
- ✅ Dependency is NOT created
- ✅ Modal remains open for correction

#### 7.7 Close Modal and Verify Updates
1. Add/remove some dependencies
2. Close modal
3. Refresh task detail view

**Expected Results:**
- ✅ Modal closes smoothly
- ✅ Changes are persisted
- ✅ Task detail view updates automatically (via event listener)
- ✅ Dependency counts match modal changes
- ✅ Badges in Kanban update

---

## 8. Verify My Day View Integration

**Objective:** Ensure My Day view shows dependency info correctly

### Steps:

#### 8.1 Navigate to My Day
1. Go to WorkHub My Day view
2. Ensure you have tasks with dependencies assigned to today

**Expected Results:**
- ✅ My Day page loads successfully
- ✅ Tasks appear in appropriate sections

#### 8.2 Check Task Cards
1. Observe task cards with dependencies

**Expected Results:**
- ✅ Task cards show dependency badges
- ✅ "Bloqueada por N" badge appears (red)
- ✅ "Bloquea N" badge appears (orange/yellow)
- ✅ Blocked tasks have visual highlighting (red border, gradient)
- ✅ Warning icon appears for blocked tasks

#### 8.3 Check "Blocking Others" Section
1. Look for "Blocking Others" section (should exist from previous implementation)
2. Complete Task A to unblock Tasks B and C

**Expected Results:**
- ✅ Section shows tasks you're blocking
- ✅ As you complete tasks, blocking list updates
- ✅ Counts update in real-time

---

## 9. Cross-View Consistency Check

**Objective:** Verify dependency data is consistent across all views

### Steps:
1. Note dependency counts for a task in Kanban view
2. Open task detail view
3. Check dependency counts
4. Open My Day view
5. Check dependency counts

**Expected Results:**
- ✅ Counts match across all views
- ✅ Task data is synchronized
- ✅ Changes in one view reflect in others (after refresh)

---

## 10. Edge Cases and Error Handling

**Objective:** Test boundary conditions

### Test Cases:

#### 10.1 Task with Many Dependencies
1. Create a task with 5+ blocking dependencies
2. View in Kanban, task detail, and popover

**Expected Results:**
- ✅ Badge shows correct count
- ✅ Popover lists all dependencies
- ✅ Popover is scrollable if needed
- ✅ No UI breaking

#### 10.2 Rapid Dependency Changes
1. Quickly add and remove multiple dependencies
2. Observe UI updates

**Expected Results:**
- ✅ UI handles rapid changes gracefully
- ✅ No duplicate entries
- ✅ Counts remain accurate
- ✅ No JavaScript errors in console

#### 10.3 Network Errors
1. Simulate network failure (browser dev tools)
2. Try to add/remove dependency

**Expected Results:**
- ✅ Error message appears
- ✅ UI doesn't break
- ✅ User can retry

---

## Test Summary Checklist

After completing all tests, verify:

### Functionality
- ✅ Can create tasks
- ✅ Can add dependencies via modal
- ✅ Can remove dependencies via modal
- ✅ Dependency badges appear correctly
- ✅ Popovers show detailed task info
- ✅ Blocked tasks are visually highlighted
- ✅ Warnings appear when completing blocking tasks
- ✅ Circular dependencies are prevented

### UI/UX
- ✅ Modal opens/closes smoothly
- ✅ Badges are clearly visible
- ✅ Popovers are well-positioned
- ✅ Highlighting is subtle but effective
- ✅ Colors follow Santa Brisa palette
- ✅ Design follows Neobrutalismo Editorial style
- ✅ Responsive on mobile/tablet (if applicable)

### Integration
- ✅ Kanban view shows badges
- ✅ My Day view shows badges and highlighting
- ✅ Task detail shows dependency sections
- ✅ Data consistent across views
- ✅ Real-time updates work

### Performance
- ✅ Pages load quickly
- ✅ Popovers appear instantly
- ✅ No lag when adding/removing dependencies
- ✅ No console errors

### Acceptance Criteria
- ✅ AC-1: Users can define 'blocked by' and 'blocks' relationships
- ✅ AC-2: Task cards show blocking/blocked indicators with count
- ✅ AC-3: Clicking indicator shows linked tasks
- ✅ AC-4: System warns when completing tasks that block others
- ✅ AC-5: Blocked tasks are highlighted in views

---

## Issues Found

Document any bugs or issues encountered during testing:

### Issue 1:
- **Description:**
- **Steps to Reproduce:**
- **Expected:**
- **Actual:**
- **Severity:**

### Issue 2:
- **Description:**
- **Steps to Reproduce:**
- **Expected:**
- **Actual:**
- **Severity:**

---

## Test Completion

**Tester:** ________________
**Date:** ________________
**Environment:** ________________
**Overall Result:** ☐ PASS ☐ FAIL ☐ PARTIAL

**Notes:**

---

## Next Steps

After completing manual testing:
1. Fix any issues found
2. Run automated API tests: `bench --site [site] execute workhub_frappe_app.scripts.test_dependencies.run_all_tests`
3. Update build-progress.txt with results
4. Mark subtask 5.2 as completed in implementation_plan.json
5. Commit changes: `git commit -m "auto-claude: 5.2 - Manual integration testing completed"`
6. Update QA sign-off status in implementation_plan.json
