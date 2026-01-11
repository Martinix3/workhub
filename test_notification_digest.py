#!/usr/bin/env python3
"""
Test Script for Smart Notification Digest Feature
Run this script in Frappe bench console to test notification routing and digest functionality.

Usage:
    bench --site [your-site] console
    >>> exec(open('apps/workhub/test_notification_digest.py').read())
"""

import frappe
from frappe.utils import now_datetime
from datetime import datetime, timedelta


def setup_test_user(user_email="test@example.com"):
    """Create or verify test user exists"""
    if not frappe.db.exists("User", user_email):
        print(f"⚠️  User {user_email} does not exist. Create it first.")
        return False

    print(f"✅ Test user {user_email} exists")
    return True


def set_notification_preferences(user_email, frequency='daily', email_enabled=True,
                                 priority_bypass=True, quiet_hours_enabled=False,
                                 quiet_start=None, quiet_end=None):
    """Set notification preferences for a user"""
    from workhub_frappe_app.api.notifications import get_user_notification_preferences

    # Get or create preferences
    prefs_name = user_email

    try:
        prefs = frappe.get_doc("WH Notification Preferences", prefs_name)
    except frappe.DoesNotExistError:
        prefs = frappe.new_doc("WH Notification Preferences")
        prefs.user = user_email

    # Update preferences
    prefs.frequency = frequency
    prefs.email_enabled = 1 if email_enabled else 0
    prefs.priority_bypass_enabled = 1 if priority_bypass else 0
    prefs.quiet_hours_enabled = 1 if quiet_hours_enabled else 0

    if quiet_hours_enabled:
        prefs.quiet_hours_start = quiet_start or "22:00:00"
        prefs.quiet_hours_end = quiet_end or "08:00:00"

    prefs.save(ignore_permissions=True)
    frappe.db.commit()

    # Clear cache
    cache_key = f"notification_preferences:{user_email}"
    frappe.cache().delete_value(cache_key)

    print(f"✅ Preferences set for {user_email}:")
    print(f"   - Frequency: {frequency}")
    print(f"   - Email: {email_enabled}")
    print(f"   - Priority Bypass: {priority_bypass}")
    print(f"   - Quiet Hours: {quiet_hours_enabled}")
    if quiet_hours_enabled:
        print(f"   - Quiet Hours Range: {prefs.quiet_hours_start} - {prefs.quiet_hours_end}")

    return prefs


def test_scenario_1_realtime_immediate():
    """Test Scenario 1: Real-time notifications (immediate routing)"""
    print("\n" + "="*60)
    print("TEST SCENARIO 1: Real-time Notifications (Immediate)")
    print("="*60)

    user = "test@example.com"

    # Setup
    if not setup_test_user(user):
        return

    set_notification_preferences(user, frequency='realtime', email_enabled=True,
                                 priority_bypass=True, quiet_hours_enabled=False)

    # Create notification
    from workhub_frappe_app.api.notifications import create_notification

    notif = create_notification(
        user=user,
        notification_type="TASK_ASSIGNED",
        title="Test Task - Real-time P2",
        message="This should be sent immediately",
        priority="MEDIUM",
        task_priority="P2"
    )

    # Verify
    doc = frappe.get_doc("WH Notification", notif)
    print(f"\n📬 Notification created: {notif}")
    print(f"   - Type: {doc.type}")
    print(f"   - Title: {doc.title}")
    print(f"   - Queued for digest: {doc.queued_for_digest}")
    print(f"   - Expected: queued_for_digest=0 (immediate)")

    if doc.queued_for_digest == 0:
        print("   ✅ PASS: Notification sent immediately")
    else:
        print("   ❌ FAIL: Notification was queued (expected immediate)")

    print("\n📧 Check email inbox for immediate notification email")

    return notif


def test_scenario_2_quiet_hours():
    """Test Scenario 2: Quiet hours enforcement"""
    print("\n" + "="*60)
    print("TEST SCENARIO 2: Quiet Hours Enforcement")
    print("="*60)

    user = "test@example.com"

    # Setup - set quiet hours to current time ± 1 hour
    current_time = datetime.now()
    quiet_start = (current_time - timedelta(hours=1)).strftime("%H:%M:%S")
    quiet_end = (current_time + timedelta(hours=1)).strftime("%H:%M:%S")

    print(f"⏰ Current time: {current_time.strftime('%H:%M:%S')}")
    print(f"⏰ Quiet hours: {quiet_start} - {quiet_end}")

    set_notification_preferences(user, frequency='realtime', email_enabled=True,
                                 priority_bypass=False,  # Important: disable bypass!
                                 quiet_hours_enabled=True,
                                 quiet_start=quiet_start,
                                 quiet_end=quiet_end)

    # Create notification during quiet hours
    from workhub_frappe_app.api.notifications import create_notification

    notif = create_notification(
        user=user,
        notification_type="TASK_ASSIGNED",
        title="Test Task - During Quiet Hours",
        message="This should be queued (not immediate)",
        priority="MEDIUM",
        task_priority="P2"
    )

    # Verify
    doc = frappe.get_doc("WH Notification", notif)
    print(f"\n📬 Notification created: {notif}")
    print(f"   - Type: {doc.type}")
    print(f"   - Title: {doc.title}")
    print(f"   - Queued for digest: {doc.queued_for_digest}")
    print(f"   - Expected: queued_for_digest=1 (queued)")

    if doc.queued_for_digest == 1:
        print("   ✅ PASS: Notification queued (quiet hours enforced)")
    else:
        print("   ❌ FAIL: Notification sent immediately (quiet hours not enforced)")

    return notif


def test_scenario_3_priority_bypass():
    """Test Scenario 3: Priority bypass (P0/P1 always immediate)"""
    print("\n" + "="*60)
    print("TEST SCENARIO 3: Priority Bypass (P0/P1 Immediate)")
    print("="*60)

    user = "test@example.com"

    # Setup - weekly digest + quiet hours, but priority bypass ON
    current_time = datetime.now()
    quiet_start = (current_time - timedelta(hours=1)).strftime("%H:%M:%S")
    quiet_end = (current_time + timedelta(hours=1)).strftime("%H:%M:%S")

    set_notification_preferences(user, frequency='weekly', email_enabled=True,
                                 priority_bypass=True,  # Important: enable bypass!
                                 quiet_hours_enabled=True,
                                 quiet_start=quiet_start,
                                 quiet_end=quiet_end)

    # Test P0
    from workhub_frappe_app.api.notifications import create_notification

    notif_p0 = create_notification(
        user=user,
        notification_type="TASK_ASSIGNED",
        title="CRITICAL - P0 Task",
        message="This should bypass all settings and send immediately",
        priority="HIGH",
        task_priority="P0"
    )

    doc_p0 = frappe.get_doc("WH Notification", notif_p0)
    print(f"\n📬 P0 Notification created: {notif_p0}")
    print(f"   - Queued for digest: {doc_p0.queued_for_digest}")
    print(f"   - Expected: queued_for_digest=0 (immediate)")

    if doc_p0.queued_for_digest == 0:
        print("   ✅ PASS: P0 bypassed settings (immediate)")
    else:
        print("   ❌ FAIL: P0 was queued (should bypass)")

    # Test P1
    notif_p1 = create_notification(
        user=user,
        notification_type="TASK_ASSIGNED",
        title="URGENT - P1 Task",
        message="This should also bypass all settings and send immediately",
        priority="HIGH",
        task_priority="P1"
    )

    doc_p1 = frappe.get_doc("WH Notification", notif_p1)
    print(f"\n📬 P1 Notification created: {notif_p1}")
    print(f"   - Queued for digest: {doc_p1.queued_for_digest}")
    print(f"   - Expected: queued_for_digest=0 (immediate)")

    if doc_p1.queued_for_digest == 0:
        print("   ✅ PASS: P1 bypassed settings (immediate)")
    else:
        print("   ❌ FAIL: P1 was queued (should bypass)")

    print("\n📧 Check email inbox for TWO immediate notification emails (P0 and P1)")

    return notif_p0, notif_p1


def test_scenario_4_daily_digest_queuing():
    """Test Scenario 4: Daily digest queuing"""
    print("\n" + "="*60)
    print("TEST SCENARIO 4: Daily Digest Queuing")
    print("="*60)

    user = "test@example.com"

    # Setup
    set_notification_preferences(user, frequency='daily', email_enabled=True,
                                 priority_bypass=True)

    # Create multiple notifications of different types
    from workhub_frappe_app.api.notifications import create_notification

    notifications = []

    # Task assigned
    notif1 = create_notification(
        user=user,
        notification_type="TASK_ASSIGNED",
        title="Task A assigned to you",
        message="Task A details",
        priority="MEDIUM",
        task_priority="P2"
    )
    notifications.append(notif1)

    # Task completed
    notif2 = create_notification(
        user=user,
        notification_type="TASK_COMPLETED",
        title="Task B completed",
        message="Task B is done",
        priority="LOW",
        task_priority="P2"
    )
    notifications.append(notif2)

    # Overdue
    notif3 = create_notification(
        user=user,
        notification_type="OVERDUE",
        title="Task C is overdue",
        message="Task C missed deadline",
        priority="HIGH",
        task_priority="P2"
    )
    notifications.append(notif3)

    # Verify all queued
    print(f"\n📬 Created {len(notifications)} notifications:")
    all_queued = True
    for notif_id in notifications:
        doc = frappe.get_doc("WH Notification", notif_id)
        print(f"   - {doc.type}: {doc.title}")
        print(f"     Queued: {doc.queued_for_digest} (expected: 1)")
        if doc.queued_for_digest != 1:
            all_queued = False

    if all_queued:
        print("\n   ✅ PASS: All notifications queued for digest")
    else:
        print("\n   ❌ FAIL: Some notifications not queued")

    print("\n📧 No immediate emails should be sent")
    print("   Run test_scenario_5_digest_email() to send the digest")

    return notifications


def test_scenario_5_digest_email():
    """Test Scenario 5: Send digest email"""
    print("\n" + "="*60)
    print("TEST SCENARIO 5: Digest Email Content and Grouping")
    print("="*60)

    user = "test@example.com"

    # Check for queued notifications
    queued = frappe.db.count("WH Notification", {
        "user": user,
        "queued_for_digest": 1,
        "digest_sent_at": ["is", "not set"]
    })

    print(f"\n📬 Queued notifications for {user}: {queued}")

    if queued == 0:
        print("   ⚠️  No queued notifications. Run test_scenario_4_daily_digest_queuing() first")
        return

    # Send digest
    from workhub_frappe_app.api.notifications import send_digest_email

    result = send_digest_email(user, digest_type='daily')

    print(f"\n📧 Digest email result:")
    print(f"   - Sent: {result.get('sent')}")
    print(f"   - Count: {result.get('count')}")
    print(f"   - Reason: {result.get('reason', 'N/A')}")

    if result.get('sent'):
        print(f"\n   ✅ PASS: Digest email sent with {result.get('count')} notifications")
        print("   📧 Check email inbox for digest email with grouping")

        # Verify notifications marked as sent
        sent_count = frappe.db.count("WH Notification", {
            "user": user,
            "digest_sent_at": ["is", "set"]
        })
        print(f"\n   📬 Notifications marked as sent: {sent_count}")

        # Try to send again (should not send duplicates)
        print(f"\n   🔄 Testing duplicate prevention...")
        result2 = send_digest_email(user, digest_type='daily')
        if not result2.get('sent') and result2.get('count') == 0:
            print(f"   ✅ PASS: Duplicate digest prevented")
        else:
            print(f"   ❌ FAIL: Duplicate digest sent")
    else:
        print(f"   ❌ FAIL: Digest email not sent")

    return result


def test_scenario_6_frequency_off():
    """Test Scenario 6: Frequency OFF (no emails)"""
    print("\n" + "="*60)
    print("TEST SCENARIO 6: Frequency OFF (In-App Only)")
    print("="*60)

    user = "test@example.com"

    # Setup
    set_notification_preferences(user, frequency='off', email_enabled=True)

    # Create notification
    from workhub_frappe_app.api.notifications import create_notification

    notif = create_notification(
        user=user,
        notification_type="TASK_ASSIGNED",
        title="Task with frequency OFF",
        message="Should be in-app only, no emails",
        priority="MEDIUM",
        task_priority="P2"
    )

    # Verify
    doc = frappe.get_doc("WH Notification", notif)
    print(f"\n📬 Notification created: {notif}")
    print(f"   - Type: {doc.type}")
    print(f"   - Title: {doc.title}")
    print(f"   - Queued for digest: {doc.queued_for_digest}")

    print(f"\n   ✅ Notification created for in-app viewing")
    print(f"   📧 No email should be sent (frequency=off)")
    print(f"   💻 Check in-app notifications to see it")

    return notif


def cleanup_test_notifications(user="test@example.com"):
    """Clean up test notifications"""
    print("\n" + "="*60)
    print("CLEANUP: Removing test notifications")
    print("="*60)

    notifications = frappe.get_all("WH Notification",
                                   filters={"user": user},
                                   pluck="name")

    count = len(notifications)

    for notif in notifications:
        frappe.delete_doc("WH Notification", notif, ignore_permissions=True)

    frappe.db.commit()

    print(f"✅ Deleted {count} notifications for {user}")


def run_all_tests():
    """Run all test scenarios in sequence"""
    print("\n" + "="*60)
    print("RUNNING ALL TEST SCENARIOS")
    print("="*60)

    user = "test@example.com"

    # Cleanup first
    cleanup_test_notifications(user)

    # Run scenarios
    test_scenario_1_realtime_immediate()
    test_scenario_2_quiet_hours()
    test_scenario_3_priority_bypass()
    test_scenario_4_daily_digest_queuing()
    test_scenario_5_digest_email()
    test_scenario_6_frequency_off()

    print("\n" + "="*60)
    print("ALL TESTS COMPLETE")
    print("="*60)
    print("\nPlease verify:")
    print("1. Check email inbox for immediate and digest emails")
    print("2. Check notification preferences in UI at /settings")
    print("3. Review logs for any errors")
    print("4. Verify notification grouping in digest email")


# Interactive menu
def show_menu():
    """Show interactive test menu"""
    print("\n" + "="*60)
    print("Smart Notification Digest - Test Menu")
    print("="*60)
    print("\nAvailable tests:")
    print("  1. Real-time Immediate Notifications")
    print("  2. Quiet Hours Enforcement")
    print("  3. Priority Bypass (P0/P1)")
    print("  4. Daily Digest Queuing")
    print("  5. Send Digest Email")
    print("  6. Frequency OFF (In-App Only)")
    print("  7. Run All Tests")
    print("  8. Cleanup Test Notifications")
    print("  9. Exit")
    print("\nUsage:")
    print("  >>> test_scenario_1_realtime_immediate()")
    print("  >>> test_scenario_2_quiet_hours()")
    print("  >>> run_all_tests()")
    print("  >>> cleanup_test_notifications()")
    print("="*60)


# Show menu when script is loaded
show_menu()
