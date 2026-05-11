# WorkHub Dependency API Testing

## Test Script: test_dependencies.py

Comprehensive test suite for the Task Dependencies & Blocker Visualization feature (Task #022).

### What It Tests

The script validates all dependency-related API endpoints:

1. **get_tasks()** - Includes `blocked_by_count` and `blocks_count` in response
2. **get_board()** - Includes dependency counts in Kanban board data
3. **change_status()** - Warns when completing tasks that block others
4. **move_task()** - Warns when moving tasks to DONE that block others
5. **get_dependency_popover_data()** - Returns detailed dependency information
6. **get_dependency_counts()** - Batch query for multiple task dependency counts
7. **add_dependency()** - Creates new dependencies with validation
8. **add_dependency()** - Prevents circular dependencies (error case)
9. **remove_dependency()** - Soft-deletes dependencies
10. **get_task_dependencies()** - Returns predecessors and successors

### How to Run

From the frappe-bench directory:

```bash
# Method 1: Execute directly
bench --site [your-site-name] execute workhub_frappe_app.scripts.test_dependencies.run_all_tests

# Method 2: From Frappe console
bench --site [your-site-name] console
>>> from workhub_frappe_app.scripts.test_dependencies import run_all_tests
>>> run_all_tests()
```

### Test Data

The script automatically:
- Creates a test project
- Creates 4 test tasks with dependencies
- Runs all validation tests
- Cleans up all test data when done

### Output

The script provides detailed output showing:
- ✓ Passed tests (green checks)
- ✗ Failed tests (red X's)
- Test summary with pass/fail counts
- List of any errors encountered

### Example Output

```
======================================================================
WorkHub Dependency API Test Suite
======================================================================
Started: 2026-01-11 04:30:15
User: administrator
Site: yoursite.local

[SETUP] Creating test data...
  [INFO] Created test project: WH-PROJ-00123
  [INFO] Created test task: WH-TASK-00456 - Task A - Predecessor
  ...

[TEST] get_tasks() includes dependency counts
  ✓ [PASS] Returns tasks
  ✓ [PASS] Task A has blocked_by_count
  ✓ [PASS] Task A has blocks_count
  ✓ [PASS] Task A blocks_count is 2
  ...

======================================================================
TEST SUMMARY
======================================================================
Total Tests: 52
✓ Passed: 52
✗ Failed: 0

Completed: 2026-01-11 04:30:25
======================================================================
```

### Prerequisites

- Frappe/ERPNext environment running
- WorkHub app installed
- Valid user session
- WH Task and WH Project DocTypes available

### Notes

- All test data is automatically cleaned up after tests complete
- Tests use `ignore_permissions=True` to ensure reliable execution
- Safe to run on production sites (creates and removes test data)
- Each test is isolated and validates specific functionality
