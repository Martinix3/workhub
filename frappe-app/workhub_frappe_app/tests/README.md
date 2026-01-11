# WorkLink Auto-Suggestions - Unit Tests

This directory contains comprehensive unit tests for the WorkLink Auto-Suggestions feature.

## Test Coverage

### 1. Document Matcher Tests (`test_document_matcher.py`)

Tests the core matching logic in `services/document_matcher.py`:

#### Keyword Extraction
- ✅ Extract Sales Order document numbers (SO-12345)
- ✅ Extract Spanish document references (FV-001, DN-002)
- ✅ Extract batch/lot codes (BATCH-ABC123, L12345)
- ✅ Extract customer names (Title Case, ALL CAPS, with legal suffixes)
- ✅ Extract product/item codes (ITEM-123, SKU-456)
- ✅ Extract general keywords (filtering stop words)
- ✅ Handle empty/mixed Spanish-English text

#### Fuzzy Matching
- ✅ Exact string matches
- ✅ Partial matches
- ✅ Substring detection
- ✅ Word overlap calculation
- ✅ No match scenarios

#### Context Filtering
- ✅ Department-based boosting (15% boost for matching departments)
- ✅ Recent document boosting (25% boost for last 30 days)
- ✅ Empty suggestions handling

#### Pattern Learning
- ✅ Analyze accepted suggestions
- ✅ Analyze dismissed suggestions
- ✅ Boost frequently accepted doctypes (up to 20%)
- ✅ Penalize frequently dismissed doctypes (up to 30%)
- ✅ Keyword-based pattern matching (up to 15%)
- ✅ No history scenarios

#### User Context
- ✅ Sales role identification
- ✅ Operations role identification
- ✅ System Manager permissions (all departments)
- ✅ Recent documents retrieval

#### Matching Helpers
- ✅ Document number exact matching
- ✅ Document number fuzzy matching
- ✅ Customer name matching
- ✅ Batch code matching
- ✅ Product code matching
- ✅ Keyword fuzzy matching
- ✅ Invalid doctype handling

#### Main Function
- ✅ Match with document numbers
- ✅ Handle empty titles
- ✅ Respect limit parameter

### 2. API Tests (`test_worklink_suggestions_api.py`)

Tests the API endpoints in `api/worklink_suggestions.py`:

#### get_suggestions Endpoint
- ✅ Basic suggestions retrieval
- ✅ Empty title validation
- ✅ Department parameter handling
- ✅ Invalid department validation
- ✅ Limit parameter (1-10 bounds)
- ✅ Description parameter
- ✅ Result enrichment with display info

#### accept_suggestion Endpoint
- ✅ Create new WorkLink
- ✅ Update existing WorkLink
- ✅ Missing parameters validation
- ✅ Task not found handling
- ✅ Document not found handling
- ✅ Confidence score recording
- ✅ Error handling with rollback

#### dismiss_suggestion Endpoint
- ✅ Basic dismissal recording
- ✅ Missing parameters validation
- ✅ Task not found handling
- ✅ Confidence score recording
- ✅ Graceful error handling (non-critical)

#### Helper Functions
- ✅ Document display info for Sales Order
- ✅ Document display info for Work Order
- ✅ Error handling for invalid documents
- ✅ Suggestion action recording (accepted)
- ✅ Suggestion action recording (dismissed)
- ✅ Keyword extraction for pattern learning
- ✅ Error handling in logging

## Running Tests

### Option 1: Direct Python Execution

```bash
# Run all tests
cd frappe-app/workhub_frappe_app/tests
python3 run_tests.py

# Run specific test file
python3 test_document_matcher.py
python3 test_worklink_suggestions_api.py
```

### Option 2: From Frappe Bench

```bash
# From frappe-bench directory
bench --site [site-name] run-tests --app workhub_frappe_app --module workhub_frappe_app.tests
```

### Option 3: Using Python unittest

```bash
# Run all tests in directory
python3 -m unittest discover -s frappe-app/workhub_frappe_app/tests -p "test_*.py" -v

# Run specific test class
python3 -m unittest workhub_frappe_app.tests.test_document_matcher.TestKeywordExtraction -v

# Run specific test method
python3 -m unittest workhub_frappe_app.tests.test_document_matcher.TestKeywordExtraction.test_extract_document_numbers_sales_order -v
```

## Test Statistics

- **Total Test Classes**: 11
- **Total Test Methods**: 60+
- **Coverage Areas**:
  - Keyword extraction: 8 tests
  - Fuzzy matching: 5 tests
  - Context filtering: 3 tests
  - Pattern learning: 4 tests
  - User context: 4 tests
  - Matching helpers: 6 tests
  - Main matching: 3 tests
  - API get_suggestions: 8 tests
  - API accept_suggestion: 8 tests
  - API dismiss_suggestion: 5 tests
  - Helper functions: 6 tests

## Mocking Strategy

Tests use Python's `unittest.mock` to isolate functionality:

- **Database calls**: Mocked with `@patch('frappe.db.*')`
- **Frappe API**: Mocked with `@patch('frappe.get_all')`, `@patch('frappe.get_doc')`
- **Authentication**: Mocked with `@patch('require_auth')`, `@patch('require_permission')`
- **Session**: Mocked with `@patch('frappe.session')`

This ensures tests run fast and don't require a live Frappe database.

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run WorkLink Suggestions Tests
  run: |
    cd apps/workhub
    python3 frappe-app/workhub_frappe_app/tests/run_tests.py
```

## Adding New Tests

When adding new functionality:

1. Add test methods to existing test classes if related
2. Create new test classes for new modules
3. Follow existing patterns for mocking and assertions
4. Ensure test names are descriptive (`test_<what>_<scenario>`)
5. Add docstrings explaining what is being tested
6. Update this README with new test coverage

## Dependencies

Tests require:
- Python 3.8+
- `unittest` (standard library)
- `unittest.mock` (standard library)
- Frappe framework (for imports, not for execution)

No additional test dependencies required!

## Troubleshooting

### ImportError: No module named 'frappe'

Tests use mocking, so Frappe doesn't need to be installed for basic syntax checking. However, if running in a Frappe context:

```bash
# Ensure you're in the frappe-bench directory
cd /path/to/frappe-bench
bench --site [site-name] console
>>> import workhub_frappe_app.tests.test_document_matcher
```

### Tests fail with "frappe.throw" errors

Ensure you're mocking `frappe.throw`:

```python
@patch('workhub_frappe_app.api.worklink_suggestions.frappe.throw')
def test_something(self, mock_throw):
    # Your test code
    mock_throw.assert_called()
```

## License

Copyright (c) 2025, WorkHub and contributors
For license information, please see license.txt
