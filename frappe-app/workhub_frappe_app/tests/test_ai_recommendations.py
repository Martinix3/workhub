# Unit Tests for AI Recommendations Service
# Tests scoring algorithm, duration estimation, and at-risk detection

import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from frappe.utils import nowdate, getdate, add_days

# Import service functions
from workhub_frappe_app.services.ai_recommendations import (
    calculate_task_score,
    calculate_urgency_score,
    calculate_dependency_score,
    estimate_task_duration,
    find_similar_task_stats,
    extract_keywords,
    calculate_title_similarity,
    detect_at_risk_tasks,
    calculate_risk_score,
    get_risk_level,
    generate_risk_reason,
    generate_recommendation_reason,
    calculate_recommendation_confidence,
    analyze_workload_balance,
    PRIORITY_WEIGHTS,
    SCORING_WEIGHTS,
    AT_RISK_THRESHOLDS
)


class TestTaskScoringAlgorithm(unittest.TestCase):
    """Test task scoring algorithm functions."""

    def test_calculate_urgency_score_overdue(self):
        """Test urgency score for overdue task."""
        yesterday = add_days(nowdate(), -1)
        score = calculate_urgency_score(yesterday)
        self.assertEqual(score, 100, "Overdue task should have urgency score of 100")

    def test_calculate_urgency_score_today(self):
        """Test urgency score for task due today."""
        today = nowdate()
        score = calculate_urgency_score(today)
        self.assertEqual(score, 90, "Task due today should have urgency score of 90")

    def test_calculate_urgency_score_tomorrow(self):
        """Test urgency score for task due tomorrow."""
        tomorrow = add_days(nowdate(), 1)
        score = calculate_urgency_score(tomorrow)
        self.assertEqual(score, 80, "Task due tomorrow should have urgency score of 80")

    def test_calculate_urgency_score_this_week(self):
        """Test urgency score for task due within a week."""
        in_5_days = add_days(nowdate(), 5)
        score = calculate_urgency_score(in_5_days)
        self.assertGreaterEqual(score, 60, "Task due in 5 days should have urgency >= 60")
        self.assertLessEqual(score, 70, "Task due in 5 days should have urgency <= 70")

    def test_calculate_urgency_score_no_deadline(self):
        """Test urgency score when no deadline is set."""
        score = calculate_urgency_score(None)
        self.assertEqual(score, 20, "Task with no deadline should have low urgency score")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_calculate_dependency_score_blocking_others(self, mock_count):
        """Test dependency score when task blocks others."""
        # Mock: task blocks 2 others, not blocked itself
        mock_count.side_effect = [2, 0]

        score = calculate_dependency_score("TASK-001")

        # Base 50 + (2 * 15) = 80
        self.assertEqual(score, 80, "Task blocking 2 others should have dependency score of 80")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_calculate_dependency_score_blocked(self, mock_count):
        """Test dependency score when task is blocked."""
        # Mock: task blocks none, blocked by 1
        mock_count.side_effect = [0, 1]

        score = calculate_dependency_score("TASK-002")

        # Base 50 - (1 * 10) = 40
        self.assertEqual(score, 40, "Blocked task should have lower dependency score")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_calculate_dependency_score_no_dependencies(self, mock_count):
        """Test dependency score when task has no dependencies."""
        # Mock: no blocking, not blocked
        mock_count.side_effect = [0, 0]

        score = calculate_dependency_score("TASK-003")

        self.assertEqual(score, 50, "Task with no dependencies should have base score of 50")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_calculate_task_score_p0_urgent(self, mock_count):
        """Test overall task score for P0 urgent task."""
        mock_count.side_effect = [0, 0]  # No dependencies

        task = {
            "name": "TASK-P0",
            "priority": "P0",
            "due_date": nowdate(),  # Due today
            "status": "NEXT"
        }

        score = calculate_task_score(task, user_workload=0)

        # Priority: 100 * 0.4 = 40
        # Urgency: 90 * 0.3 = 27
        # Dependency: 50 * 0.2 = 10
        # Workload: 0
        # Total = 77
        self.assertGreater(score, 70, "P0 task due today should have high score")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_calculate_task_score_p2_future(self, mock_count):
        """Test overall task score for P2 task with distant deadline."""
        mock_count.side_effect = [0, 0]  # No dependencies

        task = {
            "name": "TASK-P2",
            "priority": "P2",
            "due_date": add_days(nowdate(), 60),  # 2 months away
            "status": "BACKLOG"
        }

        score = calculate_task_score(task, user_workload=0)

        # Should have lower score due to low priority and distant deadline
        self.assertLess(score, 30, "P2 task due in 2 months should have low score")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_calculate_task_score_workload_penalty(self, mock_count):
        """Test that high workload reduces task score."""
        mock_count.side_effect = [0, 0]

        task = {
            "name": "TASK-WL",
            "priority": "P1",
            "due_date": nowdate(),
            "status": "NEXT"
        }

        score_low_workload = calculate_task_score(task, user_workload=2)
        score_high_workload = calculate_task_score(task, user_workload=15)

        self.assertGreater(score_low_workload, score_high_workload,
                          "Higher workload should reduce task score")


class TestDurationEstimation(unittest.TestCase):
    """Test duration estimation functions."""

    def test_extract_keywords_spanish(self):
        """Test keyword extraction from Spanish title."""
        title = "Crear informe de ventas para el cliente"
        keywords = extract_keywords(title)

        # Should extract meaningful words, exclude stop words
        self.assertIn("crear", keywords)
        self.assertIn("informe", keywords)
        self.assertIn("ventas", keywords)
        self.assertNotIn("el", keywords)
        self.assertNotIn("para", keywords)

    def test_extract_keywords_limit(self):
        """Test that extract_keywords returns max 5 keywords."""
        title = "Una tarea muy larga con muchas palabras diferentes para probar el límite"
        keywords = extract_keywords(title)

        self.assertLessEqual(len(keywords), 5, "Should return max 5 keywords")

    def test_calculate_title_similarity_identical(self):
        """Test similarity score for identical titles."""
        title1 = "Revisar documento de marketing"
        title2 = "Revisar documento de marketing"

        similarity = calculate_title_similarity(title1, title2)

        self.assertEqual(similarity, 1.0, "Identical titles should have 100% similarity")

    def test_calculate_title_similarity_partial(self):
        """Test similarity score for partially matching titles."""
        title1 = "Crear informe ventas trimestre"
        title2 = "Crear informe marketing trimestre"

        similarity = calculate_title_similarity(title1, title2)

        # "crear", "informe", "trimestre" match; "ventas", "marketing" don't
        # Jaccard = 3 / 5 = 0.6
        self.assertGreater(similarity, 0.5, "Partially matching titles should have moderate similarity")
        self.assertLess(similarity, 1.0, "Partially matching titles should not be 100% similar")

    def test_calculate_title_similarity_no_match(self):
        """Test similarity score for completely different titles."""
        title1 = "Revisar presupuesto anual"
        title2 = "Implementar nueva funcionalidad"

        similarity = calculate_title_similarity(title1, title2)

        self.assertLess(similarity, 0.3, "Completely different titles should have low similarity")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.get_all')
    def test_find_similar_task_stats_exact_match(self, mock_get_all):
        """Test finding similar task stats with exact match."""
        # Mock stats data
        mock_get_all.return_value = [
            {
                "task_type": "informe ventas",
                "avg_duration_hours": 4.5,
                "median_duration_hours": 4.0,
                "completion_count": 12,
                "similar_task_title_pattern": "informe ventas"
            }
        ]

        result = find_similar_task_stats("crear informe de ventas", "SALES")

        self.assertIsNotNone(result, "Should find matching stats")
        self.assertEqual(result["avg_duration_hours"], 4.5)
        self.assertEqual(result["completion_count"], 12)

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.get_all')
    def test_find_similar_task_stats_no_match(self, mock_get_all):
        """Test finding similar task stats when no match exists."""
        # Mock empty stats
        mock_get_all.return_value = []

        result = find_similar_task_stats("tarea completamente nueva", "OPS")

        self.assertIsNone(result, "Should return None when no similar stats found")

    @patch('workhub_frappe_app.services.ai_recommendations.find_similar_task_stats')
    def test_estimate_task_duration_with_stats(self, mock_find_stats):
        """Test duration estimation when historical stats exist."""
        # Mock historical stats: 12 completions, avg 4.5 hours
        mock_find_stats.return_value = {
            "avg_duration_hours": 4.5,
            "median_duration_hours": 4.0,
            "completion_count": 12
        }

        task = {
            "title": "Crear informe de ventas",
            "department": "SALES"
        }

        estimated_hours, confidence = estimate_task_duration(task)

        self.assertEqual(estimated_hours, 4.5, "Should use historical average")
        self.assertGreater(confidence, 0.9, "12+ samples should give high confidence")

    @patch('workhub_frappe_app.services.ai_recommendations.find_similar_task_stats')
    def test_estimate_task_duration_low_sample_size(self, mock_find_stats):
        """Test duration estimation with low sample size."""
        # Mock stats with only 3 completions
        mock_find_stats.return_value = {
            "avg_duration_hours": 6.0,
            "median_duration_hours": 5.5,
            "completion_count": 3
        }

        task = {
            "title": "Nueva tarea poco común",
            "department": "MKT"
        }

        estimated_hours, confidence = estimate_task_duration(task)

        self.assertEqual(estimated_hours, 6.0, "Should use historical average")
        self.assertLess(confidence, 0.5, "Low sample size should give low confidence")

    @patch('workhub_frappe_app.services.ai_recommendations.find_similar_task_stats')
    def test_estimate_task_duration_fallback_manual(self, mock_find_stats):
        """Test duration estimation fallback to manual estimate."""
        # No historical stats
        mock_find_stats.return_value = None

        task = {
            "title": "Tarea completamente nueva",
            "department": "OPS",
            "estimated_hours": 8.0
        }

        estimated_hours, confidence = estimate_task_duration(task)

        self.assertEqual(estimated_hours, 8.0, "Should fallback to manual estimate")
        self.assertEqual(confidence, 0.3, "Manual estimate should have low confidence")

    @patch('workhub_frappe_app.services.ai_recommendations.find_similar_task_stats')
    def test_estimate_task_duration_no_data(self, mock_find_stats):
        """Test duration estimation when no data available."""
        # No stats, no manual estimate
        mock_find_stats.return_value = None

        task = {
            "title": "Tarea sin información",
            "department": "OPS"
        }

        estimated_hours, confidence = estimate_task_duration(task)

        self.assertIsNone(estimated_hours, "Should return None when no data")
        self.assertEqual(confidence, 0.0, "Should have zero confidence")


class TestAtRiskDetection(unittest.TestCase):
    """Test at-risk task detection functions."""

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_calculate_risk_score_overdue(self, mock_count):
        """Test risk score for overdue task."""
        mock_count.return_value = 5  # Normal workload

        task = {
            "name": "TASK-OVERDUE",
            "assigned_to": "user@example.com",
            "due_date": add_days(nowdate(), -3),  # 3 days overdue
            "priority": "P0",
            "status": "DOING"
        }

        risk_score = calculate_risk_score(task)

        # Overdue adds 0.5, P0 adds 0.1 = 0.6 minimum
        self.assertGreaterEqual(risk_score, 0.6, "Overdue P0 task should have high risk")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_calculate_risk_score_insufficient_time(self, mock_count):
        """Test risk score when estimated time exceeds available time."""
        mock_count.return_value = 3

        task = {
            "name": "TASK-TIGHT",
            "assigned_to": "user@example.com",
            "due_date": add_days(nowdate(), 2),  # 2 days away
            "estimated_duration_ai": 20,  # Needs 20 hours, only 12 available (2 days * 6h)
            "priority": "P1",
            "status": "NEXT"
        }

        risk_score = calculate_risk_score(task)

        # Should include time factor + insufficient time penalty
        self.assertGreaterEqual(risk_score, 0.4, "Task with insufficient time should be at risk")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_calculate_risk_score_blocked_status(self, mock_count):
        """Test risk score for blocked task."""
        mock_count.return_value = 2

        task = {
            "name": "TASK-BLOCKED",
            "assigned_to": "user@example.com",
            "due_date": add_days(nowdate(), 5),
            "priority": "P1",
            "status": "BLOCKED"
        }

        risk_score = calculate_risk_score(task)

        # Blocked status adds 0.2 to risk
        self.assertGreaterEqual(risk_score, 0.2, "Blocked task should have elevated risk")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_calculate_risk_score_backlog(self, mock_count):
        """Test risk score for task still in backlog."""
        mock_count.return_value = 5

        task = {
            "name": "TASK-BACKLOG",
            "assigned_to": "user@example.com",
            "due_date": add_days(nowdate(), 3),
            "priority": "P2",
            "status": "BACKLOG"
        }

        risk_score = calculate_risk_score(task)

        # Backlog adds 0.1 to risk
        self.assertGreater(risk_score, 0.0, "Backlog task approaching deadline should have some risk")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_calculate_risk_score_low_risk(self, mock_count):
        """Test risk score for task with plenty of time."""
        mock_count.return_value = 2

        task = {
            "name": "TASK-SAFE",
            "assigned_to": "user@example.com",
            "due_date": add_days(nowdate(), 30),  # 1 month away
            "estimated_duration_ai": 4,  # Only needs 4 hours
            "priority": "P2",
            "status": "NEXT"
        }

        risk_score = calculate_risk_score(task)

        self.assertLess(risk_score, 0.3, "Task with plenty of time should have low risk")

    def test_get_risk_level_critical(self):
        """Test risk level classification for critical risk."""
        self.assertEqual(get_risk_level(0.85), "critical")

    def test_get_risk_level_high(self):
        """Test risk level classification for high risk."""
        self.assertEqual(get_risk_level(0.65), "high")

    def test_get_risk_level_medium(self):
        """Test risk level classification for medium risk."""
        self.assertEqual(get_risk_level(0.45), "medium")

    def test_get_risk_level_low(self):
        """Test risk level classification for low risk."""
        self.assertEqual(get_risk_level(0.25), "low")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_generate_risk_reason_overdue(self, mock_count):
        """Test risk reason generation for overdue task."""
        task = {
            "name": "TASK-001",
            "due_date": add_days(nowdate(), -2),
            "status": "DOING",
            "priority": "P0"
        }

        reason = generate_risk_reason(task, 0.7)

        self.assertIn("vencida", reason.lower(), "Reason should mention task is overdue")
        self.assertIn("prioridad crítica", reason.lower(), "Reason should mention P0 priority")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_generate_risk_reason_blocked(self, mock_count):
        """Test risk reason generation for blocked task."""
        task = {
            "name": "TASK-002",
            "due_date": add_days(nowdate(), 1),
            "status": "BLOCKED",
            "priority": "P1"
        }

        reason = generate_risk_reason(task, 0.5)

        self.assertIn("bloqueada", reason.lower(), "Reason should mention task is blocked")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.get_all')
    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_detect_at_risk_tasks_filters(self, mock_count, mock_get_all):
        """Test that detect_at_risk_tasks only returns medium+ risk tasks."""
        # Mock tasks
        mock_get_all.return_value = [
            {
                "name": "TASK-HIGH-RISK",
                "title": "Overdue critical task",
                "assigned_to": "user@example.com",
                "due_date": add_days(nowdate(), -1),
                "priority": "P0",
                "status": "DOING",
                "estimated_duration_ai": None
            },
            {
                "name": "TASK-LOW-RISK",
                "title": "Future task",
                "assigned_to": "user@example.com",
                "due_date": add_days(nowdate(), 30),
                "priority": "P2",
                "status": "NEXT",
                "estimated_duration_ai": None
            }
        ]
        mock_count.return_value = 3

        at_risk = detect_at_risk_tasks(user="user@example.com", limit=10)

        # Should only include tasks with risk >= 0.4 (medium threshold)
        self.assertGreater(len(at_risk), 0, "Should detect at least one at-risk task")

        # All returned tasks should have medium+ risk
        for item in at_risk:
            self.assertGreaterEqual(item["risk_score"], AT_RISK_THRESHOLDS["medium"],
                                  "All returned tasks should meet medium risk threshold")


class TestRecommendationHelpers(unittest.TestCase):
    """Test helper functions for recommendations."""

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_generate_recommendation_reason_p0_urgent(self, mock_count):
        """Test recommendation reason for P0 urgent task."""
        mock_count.side_effect = [2, 0]  # Blocks 2 tasks

        task = {
            "name": "TASK-001",
            "title": "Critical task",
            "priority": "P0",
            "due_date": nowdate()
        }

        reason = generate_recommendation_reason(task, 85.0)

        self.assertIn("prioridad crítica", reason.lower())
        self.assertIn("vence hoy", reason.lower())
        self.assertIn("desbloquea", reason.lower())

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.db.count')
    def test_generate_recommendation_reason_default(self, mock_count):
        """Test default recommendation reason."""
        mock_count.side_effect = [0, 0]

        task = {
            "name": "TASK-002",
            "title": "Regular task",
            "priority": "P2",
            "due_date": add_days(nowdate(), 20)
        }

        reason = generate_recommendation_reason(task, 30.0)

        self.assertIn("siguiente", reason.lower())

    def test_calculate_recommendation_confidence_high(self):
        """Test confidence calculation for well-defined task."""
        task = {
            "due_date": add_days(nowdate(), 5),
            "estimated_duration_ai": 4.5,
            "duration_confidence": 0.8
        }

        confidence = calculate_recommendation_confidence(task, score=85.0)

        # Base 0.5 + deadline 0.2 + AI estimate (0.8 * 0.2) + high score 0.1 = 0.96
        self.assertGreater(confidence, 0.8, "Well-defined task should have high confidence")

    def test_calculate_recommendation_confidence_low(self):
        """Test confidence calculation for poorly-defined task."""
        task = {
            "due_date": None,
            "estimated_duration_ai": None,
            "duration_confidence": None
        }

        confidence = calculate_recommendation_confidence(task, score=30.0)

        # Only base confidence 0.5
        self.assertEqual(confidence, 0.5, "Poorly-defined task should have base confidence")


class TestWorkloadAnalysis(unittest.TestCase):
    """Test workload analysis functions."""

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.get_all')
    def test_analyze_workload_balance_empty(self, mock_get_all):
        """Test workload analysis with no tasks."""
        mock_get_all.return_value = []

        result = analyze_workload_balance()

        self.assertEqual(result["avg_tasks"], 0)
        self.assertEqual(result["avg_hours"], 0)
        self.assertEqual(len(result["suggestions"]), 0)

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.get_all')
    def test_analyze_workload_balance_balanced(self, mock_get_all):
        """Test workload analysis when team is balanced."""
        # Mock balanced workload: 3 users with 5 tasks each
        mock_get_all.return_value = [
            {"assigned_to": "user1@example.com", "priority": "P1", "estimated_duration_ai": 4},
            {"assigned_to": "user1@example.com", "priority": "P2", "estimated_duration_ai": 3},
            {"assigned_to": "user1@example.com", "priority": "P1", "estimated_duration_ai": 5},
            {"assigned_to": "user1@example.com", "priority": "P0", "estimated_duration_ai": 6},
            {"assigned_to": "user1@example.com", "priority": "P2", "estimated_duration_ai": 2},

            {"assigned_to": "user2@example.com", "priority": "P1", "estimated_duration_ai": 4},
            {"assigned_to": "user2@example.com", "priority": "P2", "estimated_duration_ai": 3},
            {"assigned_to": "user2@example.com", "priority": "P1", "estimated_duration_ai": 5},
            {"assigned_to": "user2@example.com", "priority": "P1", "estimated_duration_ai": 4},
            {"assigned_to": "user2@example.com", "priority": "P2", "estimated_duration_ai": 3},

            {"assigned_to": "user3@example.com", "priority": "P1", "estimated_duration_ai": 5},
            {"assigned_to": "user3@example.com", "priority": "P2", "estimated_duration_ai": 3},
            {"assigned_to": "user3@example.com", "priority": "P1", "estimated_duration_ai": 4},
            {"assigned_to": "user3@example.com", "priority": "P2", "estimated_duration_ai": 3},
            {"assigned_to": "user3@example.com", "priority": "P1", "estimated_duration_ai": 4},
        ]

        result = analyze_workload_balance()

        self.assertEqual(result["avg_tasks"], 5.0, "Should calculate correct average")
        self.assertEqual(len(result["overloaded"]), 0, "No overloaded users in balanced team")
        self.assertEqual(len(result["underloaded"]), 0, "No underloaded users in balanced team")
        self.assertEqual(len(result["suggestions"]), 0, "No rebalancing suggestions for balanced team")

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.get_all')
    def test_analyze_workload_balance_unbalanced(self, mock_get_all):
        """Test workload analysis when team is unbalanced."""
        # Mock unbalanced: user1 has 15 tasks, user2 has 2 tasks (avg = 8.5)
        tasks = []

        # User1: 15 tasks (overloaded at 1.5x avg = 12.75)
        for i in range(15):
            tasks.append({
                "assigned_to": "user1@example.com",
                "priority": "P1",
                "estimated_duration_ai": 4
            })

        # User2: 2 tasks (underloaded at 0.5x avg = 4.25)
        for i in range(2):
            tasks.append({
                "assigned_to": "user2@example.com",
                "priority": "P2",
                "estimated_duration_ai": 3
            })

        mock_get_all.return_value = tasks

        result = analyze_workload_balance()

        self.assertGreater(result["avg_tasks"], 0, "Should calculate average")
        self.assertIn("user1@example.com", result["overloaded"], "User1 should be overloaded")
        self.assertIn("user2@example.com", result["underloaded"], "User2 should be underloaded")
        self.assertGreater(len(result["suggestions"]), 0, "Should generate rebalancing suggestions")

        # Check suggestion format
        suggestion = result["suggestions"][0]
        self.assertEqual(suggestion["type"], "workload_balance")
        self.assertEqual(suggestion["from_user"], "user1@example.com")
        self.assertEqual(suggestion["to_user"], "user2@example.com")
        self.assertIn("reason", suggestion)

    @patch('workhub_frappe_app.services.ai_recommendations.frappe.get_all')
    def test_analyze_workload_balance_priority_breakdown(self, mock_get_all):
        """Test that workload analysis includes priority breakdown."""
        mock_get_all.return_value = [
            {"assigned_to": "user1@example.com", "priority": "P0", "estimated_duration_ai": 6},
            {"assigned_to": "user1@example.com", "priority": "P0", "estimated_duration_ai": 5},
            {"assigned_to": "user1@example.com", "priority": "P1", "estimated_duration_ai": 4},
            {"assigned_to": "user1@example.com", "priority": "P2", "estimated_duration_ai": 2},
        ]

        result = analyze_workload_balance()

        user_stats = result["users"][0]
        self.assertEqual(user_stats["p0_count"], 2, "Should count P0 tasks")
        self.assertEqual(user_stats["p1_count"], 1, "Should count P1 tasks")
        self.assertEqual(user_stats["p2_count"], 1, "Should count P2 tasks")
        self.assertEqual(user_stats["total_hours"], 17, "Should sum estimated hours")


class TestConstants(unittest.TestCase):
    """Test that constants are properly defined."""

    def test_priority_weights_defined(self):
        """Test priority weights are defined correctly."""
        self.assertEqual(PRIORITY_WEIGHTS["P0"], 100)
        self.assertEqual(PRIORITY_WEIGHTS["P1"], 50)
        self.assertEqual(PRIORITY_WEIGHTS["P2"], 20)

    def test_scoring_weights_sum(self):
        """Test scoring weights sum to 1.0."""
        total = sum(SCORING_WEIGHTS.values())
        self.assertAlmostEqual(total, 1.0, places=2,
                              msg="Scoring weights should sum to 1.0")

    def test_at_risk_thresholds_ordered(self):
        """Test at-risk thresholds are in correct order."""
        self.assertGreater(AT_RISK_THRESHOLDS["critical"], AT_RISK_THRESHOLDS["high"])
        self.assertGreater(AT_RISK_THRESHOLDS["high"], AT_RISK_THRESHOLDS["medium"])


# Test suite runner
def run_tests():
    """Run all test suites."""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestTaskScoringAlgorithm))
    suite.addTests(loader.loadTestsFromTestCase(TestDurationEstimation))
    suite.addTests(loader.loadTestsFromTestCase(TestAtRiskDetection))
    suite.addTests(loader.loadTestsFromTestCase(TestRecommendationHelpers))
    suite.addTests(loader.loadTestsFromTestCase(TestWorkloadAnalysis))
    suite.addTests(loader.loadTestsFromTestCase(TestConstants))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return result.wasSuccessful()


if __name__ == "__main__":
    run_tests()
