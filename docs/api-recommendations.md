# AI Recommendations API

WorkHub's AI-powered task recommendation system provides intelligent suggestions for next actions, duration estimates, at-risk detection, and workload balancing.

## Core Endpoints

### Get Next Task Recommendations

```
GET /api/method/workhub_frappe_app.api.recommendations.get_next_task_recommendations
```

Get AI-recommended next tasks for a user based on priority, deadline, dependencies, and workload.

**Parameters:**
- `user` (string, optional): User email. Defaults to current user. Managers can view recommendations for other users.
- `limit` (integer, optional): Max number of recommendations (1-20). Default: 5.

**Permissions:**
- All authenticated users can view their own recommendations
- WH Manager and System Manager roles can view recommendations for any user

**Request Example:**
```bash
curl -X GET "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.get_next_task_recommendations?limit=3" \
  -H "Authorization: token YOUR_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "user": "user@example.com",
  "count": 3,
  "recommendations": [
    {
      "task_id": "TASK-00001",
      "title": "Completar informe de ventas Q4",
      "description": "Análisis detallado de métricas...",
      "status": "NEXT",
      "priority": "P0",
      "project": "PROJ-00042",
      "department": "SALES",
      "due_date": "2026-01-15",
      "estimated_hours": 8.0,
      "estimated_duration_ai": 6.5,
      "duration_confidence": 0.85,
      "score": 92.5,
      "confidence": 0.88,
      "reason": "Tarea P0 con plazo próximo (5 días). Alta prioridad crítica para el proyecto.",
      "is_overdue": false
    },
    {
      "task_id": "TASK-00023",
      "title": "Revisar propuesta de cliente nuevo",
      "status": "NEXT",
      "priority": "P1",
      "due_date": "2026-01-12",
      "score": 75.3,
      "confidence": 0.72,
      "reason": "Urgente: vence en 2 días. Prioridad alta.",
      "is_overdue": false
    }
  ]
}
```

**Scoring Algorithm:**
- Priority weight (40%): P0=100, P1=50, P2=20
- Urgency weight (30%): Based on days until deadline (0-100)
- Dependency weight (20%): Higher for blocking tasks, lower for blocked
- Workload penalty (10%): Reduces score if user has many tasks

---

### Get At-Risk Tasks

```
GET /api/method/workhub_frappe_app.api.recommendations.get_at_risk_tasks
```

Detect tasks at risk of becoming overdue based on deadline, estimated duration, workload, and current status.

**Parameters:**
- `user` (string, optional): User email. If omitted and user is a manager, returns at-risk tasks for all users.
- `limit` (integer, optional): Max number of results (1-50). Default: 10.

**Permissions:**
- Regular users can only view their own at-risk tasks
- Managers can view at-risk tasks for all users by omitting the `user` parameter

**Request Example:**
```bash
curl -X GET "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.get_at_risk_tasks?limit=5" \
  -H "Authorization: token YOUR_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "user": null,
  "count": 2,
  "at_risk_tasks": [
    {
      "task_id": "TASK-00015",
      "title": "Migrar base de datos a producción",
      "status": "NEXT",
      "priority": "P0",
      "assigned_to": "dev@example.com",
      "project": "PROJ-00012",
      "department": "OPS",
      "due_date": "2026-01-11",
      "days_remaining": 1,
      "estimated_hours": 12.0,
      "estimated_duration_ai": 16.5,
      "risk_score": 0.92,
      "risk_level": "critical",
      "reason": "Tiempo insuficiente: quedan 1.0 días pero se estiman 16.5 horas (2.1 días) de trabajo."
    },
    {
      "task_id": "TASK-00008",
      "title": "Diseño de campaña publicitaria",
      "status": "BLOCKED",
      "priority": "P1",
      "assigned_to": "mkt@example.com",
      "due_date": "2026-01-14",
      "days_remaining": 4,
      "risk_score": 0.65,
      "risk_level": "high",
      "reason": "Tarea bloqueada con plazo próximo (4 días)."
    }
  ]
}
```

**Risk Levels:**
- `critical`: risk_score ≥ 0.80 (needs immediate attention)
- `high`: risk_score ≥ 0.60 (review soon)
- `medium`: risk_score ≥ 0.40 (monitor)
- `low`: risk_score < 0.40

**Risk Factors:**
- Overdue tasks
- Insufficient time vs estimated duration
- Blocked status with approaching deadline
- High workload on assigned user
- Tasks in BACKLOG with near deadlines

---

### Get Duration Estimate

```
GET /api/method/workhub_frappe_app.api.recommendations.get_duration_estimate
```

Get AI duration estimate for a task based on historical data from similar completed tasks.

**Parameters:**
- `task_id` (string, required): Task ID to estimate

**Permissions:**
- User must be assigned to the task, or have WH Manager/System Manager role

**Request Example:**
```bash
curl -X GET "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.get_duration_estimate?task_id=TASK-00042" \
  -H "Authorization: token YOUR_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "task_id": "TASK-00042",
  "estimated_hours": 8.5,
  "confidence": 0.78,
  "has_estimate": true,
  "source": "ai"
}
```

**Response Fields:**
- `estimated_hours`: AI-calculated duration in hours (or `null` if no data)
- `confidence`: 0-1 score (0.7+ is high confidence, based on sample size)
- `has_estimate`: `true` if AI provided an estimate
- `source`: `"ai"` if confidence > 0.5, otherwise `"fallback"` (uses manual estimate)

**Estimation Logic:**
- Finds similar completed tasks by title keywords and department
- Calculates weighted average of historical durations
- Higher confidence with more historical samples (10+ samples = max confidence)
- Falls back to manual `estimated_hours` if insufficient data

**Side Effects:**
- Updates task's `estimated_duration_ai` and `duration_confidence` fields if estimate is available

---

### Get Workload Suggestions

```
GET /api/method/workhub_frappe_app.api.recommendations.get_workload_suggestions
```

Analyze team workload distribution and get AI suggestions for rebalancing overloaded/underloaded users.

**Parameters:**
- `department` (string, optional): Filter by department (`SALES`, `OPS`, `MKT`)

**Permissions:**
- Only WH Manager and System Manager roles

**Request Example:**
```bash
curl -X GET "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.get_workload_suggestions?department=SALES" \
  -H "Authorization: token YOUR_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "department": "SALES",
  "avg_tasks": 8.3,
  "avg_hours": 42.5,
  "has_imbalance": true,
  "users": [
    {
      "user": "sales1@example.com",
      "task_count": 15,
      "total_hours": 78.5,
      "p0_count": 3,
      "p1_count": 7,
      "p2_count": 5
    },
    {
      "user": "sales2@example.com",
      "task_count": 4,
      "total_hours": 18.0,
      "p0_count": 0,
      "p1_count": 2,
      "p2_count": 2
    }
  ],
  "overloaded_users": ["sales1@example.com"],
  "underloaded_users": ["sales2@example.com"],
  "suggestions": [
    {
      "type": "redistribute",
      "from_user": "sales1@example.com",
      "from_user_name": "Ana García",
      "to_user": "sales2@example.com",
      "to_user_name": "Carlos Ruiz",
      "reason": "Ana García está sobrecargada (15 tareas, 78.5h) mientras Carlos Ruiz tiene capacidad (4 tareas, 18.0h). Considera reasignar tareas P1 o P2 de Ana a Carlos.",
      "from_workload": {
        "task_count": 15,
        "total_hours": 78.5,
        "p0_count": 3,
        "p1_count": 7,
        "p2_count": 5
      },
      "to_workload": {
        "task_count": 4,
        "total_hours": 18.0,
        "p0_count": 0,
        "p1_count": 2,
        "p2_count": 2
      }
    }
  ]
}
```

**Workload Thresholds:**
- Overloaded: > 1.5× average tasks or hours
- Underloaded: < 0.5× average tasks or hours
- Suggestions only generated when imbalance exists

---

### Submit Feedback

```
POST /api/method/workhub_frappe_app.api.recommendations.submit_feedback
```

Submit user feedback on a recommendation to improve future suggestions.

**Parameters:**
- `recommendation_id` (string, required): WH AI Recommendation ID
- `feedback_type` (string, required): One of `helpful`, `not_helpful`, `wrong`
- `comment` (string, optional): Optional comment text

**Permissions:**
- User must own the recommendation

**Request Example:**
```bash
curl -X POST "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.submit_feedback" \
  -H "Authorization: token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recommendation_id": "REC-00012",
    "feedback_type": "helpful",
    "comment": "This task was exactly what I needed to focus on"
  }'
```

**Response:**
```json
{
  "success": true,
  "feedback_id": "FEEDBACK-00023",
  "recommendation_status": "accepted"
}
```

**Side Effects:**
- Creates a WH Recommendation Feedback record
- Updates recommendation status:
  - `helpful` → status = `"accepted"`
  - `not_helpful` or `wrong` → status = `"dismissed"`

---

### Accept Recommendation

```
POST /api/method/workhub_frappe_app.api.recommendations.accept_recommendation
```

Accept a recommendation without detailed feedback.

**Parameters:**
- `recommendation_id` (string, required): WH AI Recommendation ID

**Permissions:**
- User must own the recommendation

**Request Example:**
```bash
curl -X POST "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.accept_recommendation" \
  -H "Authorization: token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"recommendation_id": "REC-00012"}'
```

**Response:**
```json
{
  "success": true,
  "recommendation_id": "REC-00012",
  "status": "accepted"
}
```

---

### Dismiss Recommendation

```
POST /api/method/workhub_frappe_app.api.recommendations.dismiss_recommendation
```

Dismiss a recommendation without detailed feedback.

**Parameters:**
- `recommendation_id` (string, required): WH AI Recommendation ID

**Permissions:**
- User must own the recommendation

**Request Example:**
```bash
curl -X POST "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.dismiss_recommendation" \
  -H "Authorization: token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"recommendation_id": "REC-00012"}'
```

**Response:**
```json
{
  "success": true,
  "recommendation_id": "REC-00012",
  "status": "dismissed"
}
```

---

### Get User Recommendations

```
GET /api/method/workhub_frappe_app.api.recommendations.get_user_recommendations
```

List all recommendations for a user with optional status filter.

**Parameters:**
- `user` (string, optional): User email. Defaults to current user.
- `status` (string, optional): Filter by status (`pending`, `accepted`, `dismissed`)
- `limit` (integer, optional): Max number of results (1-100). Default: 20.

**Permissions:**
- Users can view their own recommendations
- Managers can view recommendations for any user

**Request Example:**
```bash
curl -X GET "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.get_user_recommendations?status=pending&limit=10" \
  -H "Authorization: token YOUR_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "user": "user@example.com",
  "count": 2,
  "recommendations": [
    {
      "name": "REC-00023",
      "recommendation_type": "next_task",
      "task": "TASK-00042",
      "task_title": "Completar informe de ventas Q4",
      "task_status": "NEXT",
      "task_priority": "P0",
      "task_due_date": "2026-01-15",
      "reason": "Tarea P0 con plazo próximo (5 días). Alta prioridad crítica para el proyecto.",
      "confidence_score": 0.88,
      "status": "pending",
      "expires_at": "2026-01-12 18:30:00",
      "creation": "2026-01-10 10:15:23",
      "modified": "2026-01-10 10:15:23"
    }
  ]
}
```

**Recommendation Types:**
- `next_task`: Suggested next action
- `priority_change`: Suggested priority adjustment
- `at_risk_alert`: Task at risk of becoming overdue
- `workload_balance`: Workload rebalancing suggestion

---

### Update Task AI Data

```
POST /api/method/workhub_frappe_app.api.recommendations.update_task_ai_data
```

Manually trigger AI data update for a task (duration estimate and risk score).

**Parameters:**
- `task_id` (string, required): Task ID

**Permissions:**
- Requires write permission on WH Task DocType

**Request Example:**
```bash
curl -X POST "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.update_task_ai_data" \
  -H "Authorization: token YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task_id": "TASK-00042"}'
```

**Response:**
```json
{
  "success": true,
  "task_id": "TASK-00042",
  "estimated_duration_ai": 8.5,
  "duration_confidence": 0.78,
  "risk_score": 0.35
}
```

**Side Effects:**
- Updates task's `estimated_duration_ai`, `duration_confidence`, and `risk_score` fields

---

## Enhanced Existing Endpoints

### My Day - Get Daily View

```
GET /api/method/workhub_frappe_app.api.my_day.get_my_day
```

Enhanced with AI-recommended next tasks.

**New Response Field:**
```json
{
  "summary": { ... },
  "today": [ ... ],
  "suggested_next": [
    {
      "task_id": "TASK-00042",
      "title": "Completar informe de ventas Q4",
      "status": "NEXT",
      "priority": "P0",
      "project": "PROJ-00042",
      "due_date": "2026-01-15",
      "score": 92.5,
      "confidence": 0.88,
      "reason": "Tarea P0 con plazo próximo (5 días). Alta prioridad crítica para el proyecto."
    }
  ]
}
```

**Notes:**
- Returns top 3 AI-recommended tasks
- Gracefully degrades to empty array if AI service fails

---

### My Day - Get Focus Mode

```
GET /api/method/workhub_frappe_app.api.my_day.get_focus_mode
```

Enhanced with AI recommendations as primary logic.

**Priority Order:**
1. Tasks already DOING (always prioritized)
2. AI-recommended top task
3. Rule-based fallback (P0 NEXT → overdue → P1 NEXT)

**Response with AI:**
```json
{
  "focus_task": {
    "name": "TASK-00042",
    "title": "Completar informe de ventas Q4",
    "priority": "P0",
    "project": "PROJ-00042",
    "due_date": "2026-01-15",
    "score": 92.5,
    "confidence": 0.88
  },
  "reason": "Tarea P0 con plazo próximo (5 días). Alta prioridad crítica para el proyecto.",
  "ai_recommended": true
}
```

**Response without AI (fallback):**
```json
{
  "focus_task": {
    "name": "TASK-00023",
    "title": "Revisar propuesta cliente",
    "priority": "P0",
    "due_date": "2026-01-12"
  },
  "reason": "Tarea P0 próxima a vencer"
}
```

**Notes:**
- `ai_recommended` field indicates if AI was used
- Gracefully falls back to rule-based logic if AI fails

---

### Manager - Get Overview

```
GET /api/method/workhub_frappe_app.api.manager.get_overview
```

Enhanced with AI at-risk detection and workload suggestions.

**New Response Fields:**
```json
{
  "projects_by_health": { ... },
  "critical_tasks": [ ... ],
  "at_risk_tasks": [
    {
      "task_id": "TASK-00015",
      "title": "Migrar base de datos a producción",
      "status": "NEXT",
      "priority": "P0",
      "assigned_to": "dev@example.com",
      "assigned_name": "Pedro Martínez",
      "project": "PROJ-00012",
      "project_title": "Upgrade Infraestructura",
      "due_date": "2026-01-11",
      "days_remaining": 1,
      "risk_score": 92.0,
      "risk_level": "critical",
      "reason": "Tiempo insuficiente: quedan 1.0 días pero se estiman 16.5 horas (2.1 días) de trabajo."
    }
  ],
  "workload_balance_suggestions": [
    {
      "type": "redistribute",
      "from_user": "sales1@example.com",
      "from_user_name": "Ana García",
      "to_user": "sales2@example.com",
      "to_user_name": "Carlos Ruiz",
      "reason": "Ana García está sobrecargada (15 tareas, 78.5h) mientras Carlos Ruiz tiene capacidad (4 tareas, 18.0h)...",
      "from_workload": { "task_count": 15, "total_hours": 78.5, ... },
      "to_workload": { "task_count": 4, "total_hours": 18.0, ... }
    }
  ],
  "summary": {
    "projects_at_risk": 2,
    "critical_count": 5,
    "at_risk_count": 3,
    "workload_suggestions_count": 1
  }
}
```

**Notes:**
- `at_risk_tasks`: Top 10 AI-detected at-risk tasks across all users
- `workload_balance_suggestions`: Team rebalancing recommendations
- Summary includes counts for quick overview
- Gracefully handles AI service errors with empty arrays

---

## Background Jobs

The AI recommendation system includes automated background jobs:

### Stats Aggregation (Daily)

**Schedule:** Daily
**Function:** `workhub_frappe_app.services.ai_recommendations.aggregate_task_completion_stats`

**Purpose:**
- Analyzes completed tasks from last 90 days
- Calculates average and median durations
- Groups by department and task type
- Updates WH Task Completion Stats for future duration estimates

### At-Risk Alert Generation (Hourly)

**Schedule:** Hourly
**Function:** `workhub_frappe_app.services.ai_recommendations.generate_at_risk_alerts`

**Purpose:**
- Detects tasks at risk (up to 50 per run)
- Creates WH AI Recommendation records
- Sends WH Notification to assigned users
- Maps risk levels to notification priorities:
  - Critical/High risk → HIGH priority notification
  - Medium risk → MEDIUM priority notification

**Notification Format:**
```
Title: "⚠️ Tarea en riesgo [CRITICAL]: {task_title}"
Message: {risk_reason}
Type: AI_ALERT
Priority: HIGH
```

### Task Completion Hook (Real-time)

**Trigger:** WH Task status changes to DONE
**Function:** `record_task_completion` in ai_recommendations.py

**Purpose:**
- Records actual duration immediately when task completes
- Updates WH Task Completion Stats in real-time
- Allows AI to use fresh completion data for estimates
- Non-blocking: errors won't prevent task save

---

## Error Handling

All endpoints follow consistent error handling patterns:

**Authentication Required:**
```json
{
  "exc_type": "AuthenticationError",
  "exception": "Authentication required"
}
```

**Permission Denied:**
```json
{
  "exc_type": "PermissionError",
  "exception": "You can only view your own recommendations"
}
```

**Invalid Input:**
```json
{
  "exc_type": "ValidationError",
  "exception": "Invalid feedback type. Must be one of: helpful, not_helpful, wrong"
}
```

**Not Found:**
```json
{
  "exc_type": "DoesNotExistError",
  "exception": "WH Task TASK-99999 not found"
}
```

---

## Data Models

### WH AI Recommendation

Stores AI-generated recommendations.

**Fields:**
- `user`: Link to User
- `recommendation_type`: Select (next_task, priority_change, at_risk_alert, workload_balance)
- `task`: Link to WH Task
- `reason`: Text (explanation in Spanish)
- `confidence_score`: Float (0.0-1.0)
- `status`: Select (pending, accepted, dismissed)
- `expires_at`: Datetime

### WH Recommendation Feedback

Stores user feedback on recommendations.

**Fields:**
- `recommendation`: Link to WH AI Recommendation
- `user`: Link to User
- `feedback_type`: Select (helpful, not_helpful, wrong)
- `comment`: Small Text
- `submitted_at`: Datetime

### WH Task Completion Stats

Stores historical task completion statistics for duration estimation.

**Fields:**
- `task_type`: Data (extracted keyword from title)
- `department`: Select (SALES, OPS, MKT)
- `avg_duration_hours`: Float
- `median_duration_hours`: Float
- `completion_count`: Int
- `similar_task_title_pattern`: Data

### WH Task (AI Fields)

Enhanced with AI-computed fields:

**New Fields:**
- `estimated_duration_ai`: Float (AI-calculated hours)
- `duration_confidence`: Percent (0-100)
- `risk_score`: Percent (0-100)

---

## Usage Examples

### Complete Workflow: Next Task Recommendation

```bash
# 1. Get AI recommendations for next tasks
curl -X GET "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.get_next_task_recommendations?limit=5"

# 2. Accept a recommendation
curl -X POST "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.accept_recommendation" \
  -d '{"recommendation_id": "REC-00012"}'

# 3. Submit detailed feedback
curl -X POST "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.submit_feedback" \
  -d '{
    "recommendation_id": "REC-00012",
    "feedback_type": "helpful",
    "comment": "Perfect suggestion for my current context"
  }'
```

### Manager Dashboard with AI

```bash
# Get comprehensive manager overview with AI insights
curl -X GET "https://yoursite.com/api/method/workhub_frappe_app.api.manager.get_overview"

# Response includes:
# - at_risk_tasks: AI-detected tasks needing attention
# - workload_balance_suggestions: Team rebalancing recommendations
# - Critical/blocked tasks
# - Project health
```

### Personal Productivity Flow

```bash
# 1. Check My Day with AI suggestions
curl -X GET "https://yoursite.com/api/method/workhub_frappe_app.api.my_day.get_my_day"

# 2. Get focused recommendation
curl -X GET "https://yoursite.com/api/method/workhub_frappe_app.api.my_day.get_focus_mode"

# 3. Get duration estimate for a task
curl -X GET "https://yoursite.com/api/method/workhub_frappe_app.api.recommendations.get_duration_estimate?task_id=TASK-00042"
```

---

## Best Practices

### For Users

1. **Review AI recommendations daily** via `get_my_day` to stay aligned with priorities
2. **Provide feedback** on recommendations to improve future suggestions
3. **Check at-risk alerts** to prevent overdue tasks
4. **Use focus mode** for TDAH-optimized single-task focus

### For Managers

1. **Monitor workload balance** regularly to prevent team burnout
2. **Review at-risk tasks** in weekly meetings
3. **Act on rebalancing suggestions** to distribute work fairly
4. **Track recommendation acceptance rates** to measure AI value

### For API Integration

1. **Handle graceful degradation** - AI endpoints return empty arrays on errors
2. **Check `ai_recommended` flag** to distinguish AI vs rule-based results
3. **Respect confidence scores** - scores < 0.5 indicate low-confidence estimates
4. **Use idempotency** - recommendation IDs are stable for deduplication
5. **Monitor background jobs** - ensure stats aggregation runs daily for accurate estimates

---

## Technical Notes

### LLM Integration

The AI recommendation service uses GPT-4o-mini for natural language explanations:
- Reason generation for recommendations
- Risk explanations in Spanish
- Workload rebalancing suggestions

**Configuration:**
- Configured in site_config (already set up)
- Fallback to template-based reasons if LLM unavailable

### Performance Considerations

- **Caching:** Recommendation calculations are expensive - consider caching results
- **Limits:** Default limits (5-20 recommendations) prevent excessive computation
- **Background jobs:** Heavy stats aggregation runs daily, not on-demand
- **Database indexes:** Ensure indexes on `assigned_to`, `status`, `due_date` for performance

### Privacy & Security

- **User isolation:** Users can only see their own data (except managers)
- **Permission checks:** All endpoints validate user access to tasks/recommendations
- **Audit trail:** WH AI Recommendation and WH Recommendation Feedback track all interactions
- **No PII in reasons:** AI-generated reasons avoid including sensitive data
