# Quick Start - Dependency API Tests

## Run Tests Now

```bash
# From frappe-bench directory
bench --site [your-site-name] execute workhub_frappe_app.scripts.test_dependencies.run_all_tests
```

## What Gets Tested

✅ **10 API Endpoints** covering all dependency functionality:
- Task list dependency counts
- Kanban board dependency counts
- Blocking task warnings
- Dependency popover data
- Batch dependency queries
- Add/remove dependencies
- Circular dependency prevention

✅ **52+ Assertions** validating:
- Response structure
- Data correctness
- Error handling
- Edge cases

## Expected Output

```
======================================================================
WorkHub Dependency API Test Suite
======================================================================

[TEST] get_tasks() includes dependency counts
  ✓ [PASS] Returns tasks
  ✓ [PASS] Task A has blocked_by_count
  ✓ [PASS] Task A blocks_count is 2
  ...

======================================================================
TEST SUMMARY
======================================================================
Total Tests: 52
✓ Passed: 52
✗ Failed: 0
======================================================================
```

## Test Data

- Automatically creates temporary test data
- Runs all validation tests
- Cleans up everything when done
- **Safe to run on any site**

## Need Help?

See [README_TESTING.md](./README_TESTING.md) for full documentation.
