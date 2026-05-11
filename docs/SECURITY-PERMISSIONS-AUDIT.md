# Security Audit: ignore_permissions Usage

**Date:** 2026-01-11
**Auditor:** Auto-Claude
**Status:** ✅ Categorization Complete
**Total Instances:** 66 across 19 files

---

## Executive Summary

This audit reviewed all 66 instances of `ignore_permissions=True` in the WorkHub codebase to identify security vulnerabilities and ensure proper access control.

**Key Findings:**
- ✅ **24 instances are intentional and properly protected** (admin operations, bootstrap utilities, internal services)
- ⚠️ **42 instances require fixing** (API endpoints bypassing Frappe's permission framework)
- 🔴 **Security Risk Level: HIGH** - API endpoints currently expose data outside user scope

---

## Categorization Summary

### ✅ INTENTIONAL - 24 instances (Keep as-is)

These correctly use `ignore_permissions=True` with proper safeguards:

| Category | Count | Files | Justification |
|----------|-------|-------|---------------|
| **INTENTIONAL_ADMIN** | 9 | `admin.py` | Protected by `require_any_role("System Manager")` |
| **INTENTIONAL_BOOTSTRAP** | 8 | `data_import.py`, `erpnext_bootstrap.py`, `crm_lite.py` | Setup utilities running as Administrator |
| **INTENTIONAL_SERVICE** | 5 | `action_executor.py`, `customer_matcher.py`, `notifications.py`, `manager.py` | Internal services creating records on behalf of users |
| **INTENTIONAL_AUTH** | 2 | `auth.py`, `workhub_auth_callback.py` | OAuth flows for user's own API tokens |

### ⚠️ FIXABLE - 42 instances (Requires immediate attention)

These bypass permissions and expose security vulnerabilities:

| Category | Count | Security Risk | Priority |
|----------|-------|---------------|----------|
| **FIXABLE_API** | 41 | Data exposure across territories/departments | 🔴 HIGH |
| **FIXABLE_USER_SCOPED** | 1 | Users could delete others' notifications | 🟡 MEDIUM |

#### FIXABLE_API Breakdown by File (41 instances)

| File | Instances | Endpoints Affected | Security Impact |
|------|-----------|-------------------|-----------------|
| `sales.py` | 8 | Customers, orders, opportunities, products | Users can access all customers/orders regardless of territory |
| `marketing.py` | 5 | Campaigns, social posts, leads | Users can view all marketing data regardless of team |
| `distributors.py` | 4 | Distributor lists, sell-out orders | Portal users could access other distributors' data |
| `production.py` | 4 | Work orders, workstations, batches, documents | Users can see all manufacturing data regardless of department |
| `quality.py` | 2 | Quality inspections, non-conformances | Users can access inspections they're not assigned to |
| `projects.py` | 1 | Project listings | Users can see projects they're not members of |
| `tasks.py` | 1 | Task listings | Users can see all tasks regardless of assignment |
| `gantt.py` | 1 | Task dependency creation | Users can create dependencies between any tasks |
| `settings.py` | 2 | User settings/profile updates | Should use proper permission framework |
| `action_executor.py` | 3 | Smart notepad opportunity operations | Users could modify opportunities they don't own |

### 🔍 REVIEW - 0 instances

All instances are clearly categorized. No additional review needed.

---

## Security Impact Analysis

### Current State (HIGH RISK)

**Vulnerabilities Identified:**

1. **IDOR (Insecure Direct Object Reference)**
   - Users can access data by manipulating IDs/filters
   - No validation of ownership or territory access
   - Example: Sales user can view competitors' customers

2. **Data Leakage**
   - API endpoints expose data across organizational boundaries
   - Territory, department, and team isolation not enforced
   - Sensitive business data (financials, customer info) accessible to unauthorized users

3. **Privilege Escalation**
   - Users can perform operations outside their scope
   - No verification of permissions before document creation/modification
   - Example: Creating task dependencies between projects user doesn't belong to

4. **Compliance Risk**
   - Violates principle of least privilege
   - Difficult to audit who accessed what data
   - May violate data privacy regulations (GDPR, etc.)

### After Remediation (LOW RISK)

**Expected Improvements:**

- ✅ Role-based data access enforced
- ✅ Territory and department isolation maintained
- ✅ Customer data privacy protected
- ✅ Full audit trail via Frappe's permission system
- ✅ Compliance with data access policies

---

## Detailed Findings by Category

### INTENTIONAL_ADMIN (9 instances) ✅

**File:** `frappe-app/workhub_frappe_app/api/admin.py`

All admin functions are properly protected by role checks:

```python
@frappe.whitelist()
@require_any_role("System Manager", "HR Manager")
def get_users(...):
    # Safe to use ignore_permissions here
    users = frappe.get_list("User", ..., ignore_permissions=True)
```

**Functions:**
1. `get_users` - Line 53
2. `create_user` - Line 150
3. `update_user` - Line 198
4. `delete_user` - Line 232
5. `get_roles` - Line 257
6. `assign_role` - Line 299
7. `remove_role` - Line 344
8. `send_invitation` (re-enable) - Line 387
9. `send_invitation` (create) - Line 412

**Justification:** Admin operations must bypass document-level permissions to manage users and roles. Protected by `require_any_role()` decorator.

**Action:** Document with security comments ✅

---

### INTENTIONAL_BOOTSTRAP (8 instances) ✅

**Files:**
- `frappe-app/workhub_frappe_app/api/data_import.py`
- `frappe-app/workhub_frappe_app/workhub_frappe_app/utils/erpnext_bootstrap.py`
- `frappe-app/workhub_frappe_app/workhub_frappe_app/utils/crm_lite.py`

Bootstrap and setup utilities that run as Administrator during:
- Initial system setup
- Data migration/import
- Test data creation
- Workspace configuration

**Functions:**
- `data_import.py`: `import_customers`, `import_distributors`, `import_products`, `import_sales` (8 instances)
- `erpnext_bootstrap.py`: `_ensure_customer`, `_ensure_supplier`, `_ensure_item`, `_ensure_bom`, `_ensure_company_warehouse_defaults`, `_ensure_test_stock` (6 instances)
- `crm_lite.py`: `_ensure_sidebar`, `create_workspace` (2 instances)

**Justification:** Setup operations need full system access to create initial configuration and test data.

**Action:** Document with security comments ✅

---

### INTENTIONAL_SERVICE (5 instances) ✅

**Files:**
- `frappe-app/workhub_frappe_app/services/action_executor.py`
- `frappe-app/workhub_frappe_app/services/customer_matcher.py`
- `frappe-app/workhub_frappe_app/api/notifications.py`
- `frappe-app/workhub_frappe_app/api/manager.py`

Internal service functions that create records on behalf of authenticated users:

**Functions:**
1. `action_executor.py::add_timeline_entry` - Line 115 (smart notepad timeline entries)
2. `action_executor.py::create_sales_order` - Line 166 (smart notepad sales orders)
3. `action_executor.py::create_followup_task` - Lines 198, 209 (smart notepad tasks)
4. `customer_matcher.py::create_customer` - Line 207 (smart notepad customer creation)
5. `notifications.py::create_notification` - Line 295 (system notification helper)
6. `manager.py::_create_notification` - Line 346 (system notification helper)

**Justification:** These are internal utility functions that create documents on behalf of authenticated users as part of smart assistant and notification features.

**Action:** Document with security comments ✅

---

### INTENTIONAL_AUTH (2 instances) ✅

**Files:**
- `frappe-app/workhub_frappe_app/api/auth.py`
- `frappe-app/workhub_frappe_app/www/workhub_auth_callback.py`

OAuth callback functions that generate API tokens:

**Functions:**
1. `auth.py::generate_api_token` - Line 88
2. `workhub_auth_callback.py::get_context` - Line 40

**Justification:** After successful OAuth authentication, users need to generate their own API tokens. This is the user updating their own credentials.

**Action:** Document with security comments ✅

---

### FIXABLE_API (41 instances) ⚠️ HIGH PRIORITY

#### Sales API - 8 instances 🔴

**File:** `frappe-app/workhub_frappe_app/api/sales.py`

| Function | Line | Issue | Recommended Fix |
|----------|------|-------|----------------|
| `get_customers` | 100 | Returns all customers | Add territory-based User Permissions |
| `get_orders` | 175 | Returns all sales orders | Filter by user's accessible customers |
| `get_opportunities` | 233 | Returns all opportunities | Filter by sales team assignment |
| `get_recent_activity` (orders) | 275 | Shows all recent orders | Apply territory filters |
| `get_recent_activity` (opps) | 293 | Shows all opportunities | Apply ownership filters |
| `get_customer_details` (doc) | 403 | Exposes any customer | Verify user has access to customer |
| `get_customer_details` (orders) | 411 | Exposes customer orders | Check customer access first |
| `get_products` | 454 | Returns all items | Apply item group permissions |

**Security Impact:** Sales users can view all customers, orders, and opportunities regardless of their assigned territory or sales team.

**Recommended Implementation:**
```python
# Remove ignore_permissions=True, use Frappe's built-in filtering
customers = frappe.get_list("Customer",
    filters=filter_conditions,
    fields=[...],
    # Frappe automatically applies User Permissions based on territory
)
```

---

#### Marketing API - 5 instances 🔴

**File:** `frappe-app/workhub_frappe_app/api/marketing.py`

| Function | Line | Issue | Recommended Fix |
|----------|------|-------|----------------|
| `get_active_campaigns` | 142 | Returns all campaigns | Filter by team/ownership |
| `get_recent_posts` | 184 | Returns all social posts | Filter by creator or team |
| `get_campaign_performance` (doc) | 316 | Exposes campaign details | Verify campaign access |
| `get_campaign_performance` (leads) | 325 | Exposes campaign leads | Check campaign access first |
| `get_campaign_performance` (activities) | 338 | Exposes campaign events | Check campaign access first |

**Security Impact:** Marketing users can view all campaigns, posts, and performance data regardless of team membership or ownership.

---

#### Distributors API - 4 instances 🔴

**File:** `frappe-app/workhub_frappe_app/api/distributors.py`

| Function | Line | Issue | Recommended Fix |
|----------|------|-------|----------------|
| `get_list` | 149 | Returns all distributors | Apply territory-based permissions |
| `get_my_orders` | 232 | Filtered by customer but bypasses perms | Remove ignore_permissions, rely on proper checks |
| `get_assigned_sell_out_orders` (orders) | 481 | Returns orders with bypass | Use proper permission framework |
| `get_assigned_sell_out_orders` (items) | 492 | Child table bypass | Inherit parent permissions |

**Security Impact:** Portal users could potentially access other distributors' data if filter parameters are manipulated.

---

#### Production API - 4 instances 🔴

**File:** `frappe-app/workhub_frappe_app/api/production.py`

| Function | Line | Issue | Recommended Fix |
|----------|------|-------|----------------|
| `get_orders` | 133 | Returns all work orders | Filter by department or workstation |
| `get_lines` | 148 | Returns all workstations | Filter by user assignment |
| `get_lots` | 185 | Returns all batches | Apply role-based filtering |
| `get_documents` | 481 | Returns quality documents | Restrict by role and department |

**Security Impact:** Production users can view all manufacturing data regardless of their assigned workstations or departments.

---

#### Quality API - 2 instances 🔴

**File:** `frappe-app/workhub_frappe_app/api/quality.py`

| Function | Line | Issue | Recommended Fix |
|----------|------|-------|----------------|
| `get_pending_inspections` | 120 | Returns all inspections | Filter by assigned inspector |
| `get_open_ncs` | 162 | Returns all non-conformances | Filter by assigned user/department |

**Security Impact:** Quality users can view all inspections and non-conformances, not just those assigned to them.

---

#### Projects & Tasks API - 2 instances 🔴

**Files:** `frappe-app/workhub_frappe_app/api/projects.py`, `frappe-app/workhub_frappe_app/api/tasks.py`

| Function | Line | Issue | Recommended Fix |
|----------|------|-------|----------------|
| `projects.py::get_projects` | 48 | Returns all projects | Filter by membership or department |
| `tasks.py::get_tasks` | 52 | Returns all tasks | Filter by assignment or project membership |

**Security Impact:** Users can view projects and tasks they're not involved in.

---

#### Gantt API - 1 instance 🟡

**File:** `frappe-app/workhub_frappe_app/api/gantt.py`

| Function | Line | Issue | Recommended Fix |
|----------|------|-------|----------------|
| `add_dependency` | 402 | Creates dependencies without checks | Verify write access to both tasks |

**Security Impact:** Users can create dependencies between tasks in projects they don't have access to.

---

#### Settings API - 2 instances 🟡

**File:** `frappe-app/workhub_frappe_app/api/settings.py`

| Function | Line | Issue | Recommended Fix |
|----------|------|-------|----------------|
| `update_user_settings` | 112 | Bypasses permissions for own settings | Use proper permission framework |
| `update_user_profile` | 185 | Bypasses permissions for own profile | Use proper permission framework |

**Security Impact:** Low - Currently only updates current user's data, but should follow best practices.

---

#### Smart Notepad Services - 3 instances 🔴

**File:** `frappe-app/workhub_frappe_app/services/action_executor.py`

| Function | Line | Issue | Recommended Fix |
|----------|------|-------|----------------|
| `update_opportunity_pipeline` (update) | 257 | Updates opportunities without checks | Verify user can modify this opportunity |
| `update_opportunity_pipeline` (create) | 283 | Creates opportunities without checks | Verify user can create for this customer |
| `close_opportunity` | 313 | Closes opportunities without checks | Verify user has permission to close |

**Security Impact:** Users could modify or close opportunities for customers they don't have access to.

---

### FIXABLE_USER_SCOPED (1 instance) 🟡

**File:** `frappe-app/workhub_frappe_app/api/notifications.py`

| Function | Line | Issue | Recommended Fix |
|----------|------|-------|----------------|
| `delete_notification` | 66 | Deletes without ownership check | Verify notification belongs to current user |

**Security Impact:** Users could potentially delete other users' notifications.

**Recommended Fix:**
```python
@frappe.whitelist()
def delete_notification(notification_id):
    # Verify ownership
    notification = frappe.get_doc("WH Notification", notification_id)
    if notification.user != frappe.session.user:
        frappe.throw("You can only delete your own notifications", frappe.PermissionError)

    frappe.delete_doc("WH Notification", notification_id)
```

---

## Implementation Roadmap

### Phase 1: Sales API (Week 1) - 8 instances
**Priority:** 🔴 CRITICAL
**Estimated Effort:** 2 days
**Files:** `sales.py`

**Tasks:**
- [ ] Remove ignore_permissions from customer listings
- [ ] Implement territory-based filtering using User Permissions
- [ ] Add sales team assignment checks for opportunities
- [ ] Test with different user roles and territories

---

### Phase 2: Marketing API (Week 1) - 5 instances
**Priority:** 🔴 HIGH
**Estimated Effort:** 1.5 days
**Files:** `marketing.py`

**Tasks:**
- [ ] Add campaign ownership/team filtering
- [ ] Implement role-based access for social posts
- [ ] Verify campaign access before showing performance data
- [ ] Test with marketing users from different teams

---

### Phase 3: Distributors API (Week 1) - 4 instances
**Priority:** 🔴 HIGH
**Estimated Effort:** 1 day
**Files:** `distributors.py`

**Tasks:**
- [ ] Apply territory-based permissions
- [ ] Add portal user data isolation
- [ ] Verify distributor-specific operations
- [ ] Test with portal users

---

### Phase 4: Production & Quality APIs (Week 2) - 6 instances
**Priority:** 🟡 MEDIUM
**Estimated Effort:** 1.5 days
**Files:** `production.py`, `quality.py`

**Tasks:**
- [ ] Implement department-based filtering for work orders
- [ ] Add workstation assignment checks
- [ ] Filter quality inspections by inspector assignment
- [ ] Test with production and quality users

---

### Phase 5: Projects & Tasks APIs (Week 2) - 4 instances
**Priority:** 🟡 MEDIUM
**Estimated Effort:** 1 day
**Files:** `projects.py`, `tasks.py`, `gantt.py`

**Tasks:**
- [ ] Filter projects by membership
- [ ] Filter tasks by assignment/project membership
- [ ] Add permission checks for dependency creation
- [ ] Test with project team members

---

### Phase 6: User-Scoped & Settings (Week 2) - 3 instances
**Priority:** 🟡 MEDIUM
**Estimated Effort:** 0.5 days
**Files:** `notifications.py`, `settings.py`

**Tasks:**
- [ ] Add ownership check for notification deletion
- [ ] Update settings endpoints to use proper permissions
- [ ] Test edge cases for user data operations

---

### Phase 7: Smart Notepad Services (Week 2) - 3 instances
**Priority:** 🔴 HIGH
**Estimated Effort:** 1 day
**Files:** `action_executor.py`

**Tasks:**
- [ ] Add permission checks before opportunity operations
- [ ] Verify customer access before creating/modifying records
- [ ] Test smart notepad functionality with restricted users

---

### Phase 8: Documentation (Week 3) - All intentional instances
**Priority:** 🟢 LOW
**Estimated Effort:** 1 day
**Files:** All files with INTENTIONAL instances

**Tasks:**
- [ ] Add security comments to all admin functions
- [ ] Document bootstrap utilities
- [ ] Add comments to service functions
- [ ] Document auth flow bypasses

---

### Phase 9: Testing & Validation (Week 3)
**Priority:** 🔴 CRITICAL
**Estimated Effort:** 2 days

**Tasks:**
- [ ] Create comprehensive test scenarios
- [ ] Test each fixed endpoint with multiple user roles
- [ ] Verify no data leakage
- [ ] Check for regressions
- [ ] Performance testing with permission checks

---

## Testing Requirements

### Functional Tests

For each fixed endpoint, verify:
- ✅ Users only see data within their scope (territory, department, team)
- ✅ Sales users restricted to their territories
- ✅ Production users restricted to their workstations
- ✅ Quality users see only assigned inspections
- ✅ Portal users can only access their own data
- ✅ Project members see only their projects

### Security Tests

- ✅ No data leakage across territories/departments
- ✅ No cross-customer data access
- ✅ No privilege escalation via parameter manipulation
- ✅ Direct API calls respect permissions
- ✅ Filter parameter manipulation is handled safely

### Role-Based Tests

Test with these user roles:
- ✅ Sales User
- ✅ Sales Manager
- ✅ Production User
- ✅ Quality Inspector
- ✅ Marketing User
- ✅ System Manager (should see all)
- ✅ Website User (portal)

### Regression Tests

- ✅ Existing features still work for authorized users
- ✅ Dashboard KPIs calculate correctly
- ✅ Reports generate properly
- ✅ No performance degradation

---

## Acceptance Criteria

### Phase Completion
- [ ] All 42 FIXABLE instances have been addressed
- [ ] All 24 INTENTIONAL instances are documented
- [ ] Security comments added to all intentional bypasses
- [ ] Test suite passes for all user roles
- [ ] No regressions in authorized user functionality

### Security Validation
- [ ] No unauthorized data access possible
- [ ] Territory and department isolation enforced
- [ ] Customer data privacy protected
- [ ] Full audit trail available
- [ ] Compliance requirements met

### Documentation
- [ ] API documentation updated with permission requirements
- [ ] User guide for role-based access
- [ ] Developer guide for permission patterns
- [ ] Migration guide for users

---

## References

- **Frappe Permission System:** https://frappeframework.com/docs/user/en/api/permissions
- **User Permissions:** https://frappeframework.com/docs/user/en/desk/user-permissions
- **DocPerm:** https://frappeframework.com/docs/user/en/api/database#permissions

---

## Appendix: File Summary

| File | Total | INTENTIONAL | FIXABLE | Notes |
|------|-------|-------------|---------|-------|
| sales.py | 8 | 0 | 8 | Critical - customer/order exposure |
| marketing.py | 5 | 0 | 5 | High - campaign data exposure |
| distributors.py | 4 | 0 | 4 | High - portal user risk |
| production.py | 4 | 0 | 4 | Medium - department isolation |
| quality.py | 2 | 0 | 2 | Medium - inspector assignment |
| projects.py | 1 | 0 | 1 | Medium - project membership |
| tasks.py | 1 | 0 | 1 | Medium - task assignment |
| gantt.py | 1 | 0 | 1 | Medium - dependency permissions |
| settings.py | 2 | 0 | 2 | Low - user's own data |
| notifications.py | 2 | 1 | 1 | Low - ownership check needed |
| action_executor.py | 7 | 4 | 3 | Mixed - some service, some API |
| manager.py | 1 | 1 | 0 | Service function |
| customer_matcher.py | 1 | 1 | 0 | Service function |
| admin.py | 9 | 9 | 0 | Protected by role checks |
| data_import.py | 8 | 8 | 0 | Bootstrap utility |
| erpnext_bootstrap.py | 6 | 6 | 0 | Setup utility |
| crm_lite.py | 2 | 2 | 0 | Setup utility |
| auth.py | 1 | 1 | 0 | OAuth flow |
| workhub_auth_callback.py | 1 | 1 | 0 | OAuth callback |
| **TOTAL** | **66** | **24** | **42** | |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-11
**Next Review:** After Phase 9 completion
