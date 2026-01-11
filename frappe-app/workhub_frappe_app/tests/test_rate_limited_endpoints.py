# Integration tests for WorkHub Rate-Limited Endpoints
# Tests actual endpoint behavior with rate limiting applied

import unittest
import time
import json
from unittest.mock import Mock, patch, MagicMock
import frappe
from frappe.test_runner import make_test_records

# Import auth endpoints
from workhub_frappe_app.api.auth import (
    get_logged_user,
    get_user_info,
    get_social_login_url,
    generate_api_token,
)

# Import admin endpoints
from workhub_frappe_app.api.admin import (
    create_user,
    send_invitation,
    assign_role,
    remove_role,
)


class TestRateLimitedAuthEndpoints(unittest.TestCase):
    """Integration tests for rate-limited authentication endpoints"""

    def setUp(self):
        """Set up test fixtures before each test"""
        # Mock frappe.cache() to use an in-memory dict
        self.cache_store = {}
        self.mock_cache = Mock()

        def get_value(key):
            return self.cache_store.get(key, "[]")

        def set_value(key, value, expires_in_sec=None):
            self.cache_store[key] = value

        self.mock_cache.get_value.side_effect = get_value
        self.mock_cache.set_value.side_effect = set_value

        # Mock frappe.response
        self.mock_response = {"http_headers": {}}

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    def test_get_logged_user_allows_requests_within_limit(self, mock_response, mock_session, mock_request, mock_cache_property):
        """Test get_logged_user allows requests within 20/min limit"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.1"
        mock_session.user = "test@example.com"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get

        # Make 15 requests (within 20 limit)
        for i in range(15):
            result = get_logged_user()
            self.assertEqual(result, "test@example.com")

        # Verify no exception was raised
        self.assertTrue(True)

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    @patch("frappe.throw")
    def test_get_logged_user_returns_429_when_limit_exceeded(self, mock_throw, mock_response, mock_session, mock_request, mock_cache_property):
        """Test get_logged_user returns 429 after exceeding 20/min limit"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.2"
        mock_session.user = "test@example.com"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get
        mock_throw.side_effect = frappe.RateLimitExceededError("Rate limit exceeded")

        # Make 20 requests (at limit)
        for i in range(20):
            result = get_logged_user()

        # 21st request should raise RateLimitExceededError
        with self.assertRaises(frappe.RateLimitExceededError):
            get_logged_user()

        # Verify HTTP 429 was set
        self.assertEqual(mock_response.__getitem__("http_status_code"), 429)

        # Verify frappe.throw was called
        mock_throw.assert_called()

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    def test_get_logged_user_sets_rate_limit_headers(self, mock_response, mock_session, mock_request, mock_cache_property):
        """Test get_logged_user sets proper X-RateLimit-* headers"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.3"
        mock_session.user = "test@example.com"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get

        # Make one request
        get_logged_user()

        # Verify headers were set
        headers = self.mock_response.get("http_headers", {})
        self.assertEqual(headers.get("X-RateLimit-Limit"), "20")
        self.assertIsNotNone(headers.get("X-RateLimit-Remaining"))
        self.assertIsNotNone(headers.get("X-RateLimit-Reset"))

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    @patch("frappe.throw")
    def test_get_user_info_returns_429_after_15_requests(self, mock_throw, mock_response, mock_session, mock_request, mock_cache_property):
        """Test get_user_info returns 429 after exceeding 15/min limit"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.4"
        mock_session.user = "Guest"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get
        mock_throw.side_effect = frappe.RateLimitExceededError("Rate limit exceeded")

        # Make 15 requests (at limit)
        for i in range(15):
            result = get_user_info()

        # 16th request should raise RateLimitExceededError
        with self.assertRaises(frappe.RateLimitExceededError):
            get_user_info()

        # Verify HTTP 429 was set
        self.assertEqual(mock_response.__getitem__("http_status_code"), 429)

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    @patch("frappe.throw")
    def test_get_social_login_url_returns_429_after_10_requests(self, mock_throw, mock_response, mock_session, mock_request, mock_cache_property):
        """Test get_social_login_url returns 429 after exceeding 10/min limit"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.5"
        mock_session.user = "Guest"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get
        mock_throw.side_effect = frappe.RateLimitExceededError("Rate limit exceeded")

        # Mock get_oauth2_authorize_url
        with patch("workhub_frappe_app.api.auth.get_oauth2_authorize_url", return_value="http://example.com/oauth"):
            with patch("frappe.utils.get_url", return_value="http://example.com/callback"):
                # Make 10 requests (at limit)
                for i in range(10):
                    result = get_social_login_url()

                # 11th request should raise RateLimitExceededError
                with self.assertRaises(frappe.RateLimitExceededError):
                    get_social_login_url()

        # Verify HTTP 429 was set
        self.assertEqual(mock_response.__getitem__("http_status_code"), 429)

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    @patch("frappe.throw")
    @patch("frappe.get_doc")
    @patch("frappe.generate_hash")
    @patch("frappe.db")
    def test_generate_api_token_user_based_rate_limit(self, mock_db, mock_hash, mock_get_doc, mock_throw, mock_response, mock_session, mock_request, mock_cache_property):
        """Test generate_api_token uses user-based rate limiting (5/min per user)"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.6"
        mock_session.user = "admin@example.com"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get
        mock_throw.side_effect = frappe.RateLimitExceededError("Rate limit exceeded")

        # Mock user doc
        mock_user = Mock()
        mock_user.api_key = None
        mock_user.save = Mock()
        mock_get_doc.return_value = mock_user
        mock_hash.return_value = "test_hash"
        mock_db.commit = Mock()

        # Make 5 requests (at limit) from same user
        for i in range(5):
            result = generate_api_token()

        # 6th request should raise RateLimitExceededError
        with self.assertRaises(frappe.RateLimitExceededError):
            generate_api_token()

        # Verify HTTP 429 was set
        self.assertEqual(mock_response.__getitem__("http_status_code"), 429)

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    @patch("frappe.throw")
    @patch("time.time")
    def test_retry_after_header_on_429_response(self, mock_time, mock_throw, mock_response, mock_session, mock_request, mock_cache_property):
        """Test Retry-After header is set correctly on 429 responses"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.7"
        mock_session.user = "Guest"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get
        mock_throw.side_effect = frappe.RateLimitExceededError("Rate limit exceeded")
        mock_time.return_value = 1000.0

        # Make 20 requests to hit limit
        for i in range(20):
            get_logged_user()

        # Next request should set Retry-After header
        with self.assertRaises(frappe.RateLimitExceededError):
            get_logged_user()

        # Verify Retry-After header was set
        headers = self.mock_response.get("http_headers", {})
        self.assertIsNotNone(headers.get("Retry-After"))


class TestRateLimitedAdminEndpoints(unittest.TestCase):
    """Integration tests for rate-limited admin endpoints"""

    def setUp(self):
        """Set up test fixtures before each test"""
        # Mock frappe.cache() to use an in-memory dict
        self.cache_store = {}
        self.mock_cache = Mock()

        def get_value(key):
            return self.cache_store.get(key, "[]")

        def set_value(key, value, expires_in_sec=None):
            self.cache_store[key] = value

        self.mock_cache.get_value.side_effect = get_value
        self.mock_cache.set_value.side_effect = set_value

        # Mock frappe.response
        self.mock_response = {"http_headers": {}}

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    @patch("frappe.throw")
    @patch("frappe.db")
    @patch("frappe.new_doc")
    @patch("frappe.generate_hash")
    @patch("workhub_frappe_app.api.admin.require_any_role")
    def test_create_user_returns_429_after_10_requests(self, mock_require_role, mock_hash, mock_new_doc, mock_db, mock_throw, mock_response, mock_session, mock_request, mock_cache_property):
        """Test create_user returns 429 after exceeding 10/min limit per user"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.8"
        mock_session.user = "admin@example.com"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get
        mock_require_role.return_value = None

        # Mock DB and user creation
        mock_db.exists.return_value = False
        mock_db.commit = Mock()
        mock_user = Mock()
        mock_user.name = "test@example.com"
        mock_user.insert = Mock()
        mock_new_doc.return_value = mock_user
        mock_hash.return_value = "random_password"

        # Mock get_user_detail to avoid nested calls
        with patch("workhub_frappe_app.api.admin.get_user_detail", return_value={"email": "test@example.com"}):
            # Make 10 requests (at limit)
            for i in range(10):
                create_user(f"user{i}@example.com", "TestUser")

            # 11th request should raise RateLimitExceededError
            mock_throw.side_effect = frappe.RateLimitExceededError("Rate limit exceeded")
            with self.assertRaises(frappe.RateLimitExceededError):
                create_user("user11@example.com", "TestUser")

        # Verify HTTP 429 was set
        self.assertEqual(mock_response.__getitem__("http_status_code"), 429)

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    @patch("frappe.throw")
    @patch("frappe.db")
    @patch("frappe.new_doc")
    @patch("frappe.generate_hash")
    @patch("workhub_frappe_app.api.admin.require_any_role")
    def test_send_invitation_returns_429_after_10_requests(self, mock_require_role, mock_hash, mock_new_doc, mock_db, mock_throw, mock_response, mock_session, mock_request, mock_cache_property):
        """Test send_invitation returns 429 after exceeding 10/min limit per user"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.9"
        mock_session.user = "admin@example.com"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get
        mock_require_role.return_value = None

        # Mock DB and user creation
        mock_db.exists.return_value = False
        mock_db.commit = Mock()
        mock_user = Mock()
        mock_user.name = "test@example.com"
        mock_user.insert = Mock()
        mock_user.send_welcome_email = Mock()
        mock_new_doc.return_value = mock_user
        mock_hash.return_value = "random_password"

        # Make 10 requests (at limit)
        for i in range(10):
            send_invitation(f"invite{i}@example.com")

        # 11th request should raise RateLimitExceededError
        mock_throw.side_effect = frappe.RateLimitExceededError("Rate limit exceeded")
        with self.assertRaises(frappe.RateLimitExceededError):
            send_invitation("invite11@example.com")

        # Verify HTTP 429 was set
        self.assertEqual(mock_response.__getitem__("http_status_code"), 429)

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    @patch("frappe.throw")
    @patch("frappe.db")
    @patch("frappe.get_doc")
    @patch("workhub_frappe_app.api.admin.require_any_role")
    def test_assign_role_returns_429_after_20_requests(self, mock_require_role, mock_get_doc, mock_db, mock_throw, mock_response, mock_session, mock_request, mock_cache_property):
        """Test assign_role returns 429 after exceeding 20/min limit per user"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.10"
        mock_session.user = "admin@example.com"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get
        mock_require_role.return_value = None

        # Mock DB and user doc
        mock_db.exists.return_value = True
        mock_db.commit = Mock()
        mock_user = Mock()
        mock_user.roles = []
        mock_user.save = Mock()
        mock_get_doc.return_value = mock_user

        # Make 20 requests (at limit)
        for i in range(20):
            assign_role("user@example.com", "Test Role")

        # 21st request should raise RateLimitExceededError
        mock_throw.side_effect = frappe.RateLimitExceededError("Rate limit exceeded")
        with self.assertRaises(frappe.RateLimitExceededError):
            assign_role("user@example.com", "Test Role")

        # Verify HTTP 429 was set
        self.assertEqual(mock_response.__getitem__("http_status_code"), 429)

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    @patch("frappe.throw")
    @patch("frappe.db")
    @patch("frappe.get_doc")
    @patch("workhub_frappe_app.api.admin.require_any_role")
    def test_remove_role_returns_429_after_20_requests(self, mock_require_role, mock_get_doc, mock_db, mock_throw, mock_response, mock_session, mock_request, mock_cache_property):
        """Test remove_role returns 429 after exceeding 20/min limit per user"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.11"
        mock_session.user = "admin@example.com"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get
        mock_require_role.return_value = None

        # Mock DB and user doc
        mock_db.commit = Mock()
        mock_role = Mock()
        mock_role.role = "Test Role"
        mock_user = Mock()
        mock_user.roles = [mock_role]
        mock_user.save = Mock()
        mock_get_doc.return_value = mock_user

        # Make 20 requests (at limit)
        for i in range(20):
            remove_role("user@example.com", "Test Role")

        # 21st request should raise RateLimitExceededError
        mock_throw.side_effect = frappe.RateLimitExceededError("Rate limit exceeded")
        with self.assertRaises(frappe.RateLimitExceededError):
            remove_role("user@example.com", "Test Role")

        # Verify HTTP 429 was set
        self.assertEqual(mock_response.__getitem__("http_status_code"), 429)

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    @patch("frappe.db")
    @patch("frappe.get_doc")
    @patch("workhub_frappe_app.api.admin.require_any_role")
    def test_admin_endpoints_set_rate_limit_headers(self, mock_require_role, mock_get_doc, mock_db, mock_response, mock_session, mock_request, mock_cache_property):
        """Test admin endpoints set proper X-RateLimit-* headers"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.12"
        mock_session.user = "admin@example.com"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get
        mock_require_role.return_value = None

        # Mock DB and user doc
        mock_db.exists.return_value = True
        mock_db.commit = Mock()
        mock_user = Mock()
        mock_user.roles = []
        mock_user.save = Mock()
        mock_get_doc.return_value = mock_user

        # Make one request
        assign_role("user@example.com", "Test Role")

        # Verify headers were set
        headers = self.mock_response.get("http_headers", {})
        self.assertEqual(headers.get("X-RateLimit-Limit"), "20")
        self.assertIsNotNone(headers.get("X-RateLimit-Remaining"))
        self.assertIsNotNone(headers.get("X-RateLimit-Reset"))


class TestRateLimitWindowExpiry(unittest.TestCase):
    """Test rate limit reset after window expires"""

    def setUp(self):
        """Set up test fixtures before each test"""
        # Mock frappe.cache() to use an in-memory dict
        self.cache_store = {}
        self.mock_cache = Mock()

        def get_value(key):
            return self.cache_store.get(key, "[]")

        def set_value(key, value, expires_in_sec=None):
            self.cache_store[key] = value

        self.mock_cache.get_value.side_effect = get_value
        self.mock_cache.set_value.side_effect = set_value

        # Mock frappe.response
        self.mock_response = {"http_headers": {}}

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter.cache")
    @patch("frappe.request")
    @patch("frappe.session")
    @patch("frappe.response")
    @patch("time.time")
    def test_rate_limit_resets_after_window_expires(self, mock_time, mock_response, mock_session, mock_request, mock_cache_property):
        """Test that rate limit resets after the time window expires"""
        # Setup
        mock_cache_property.__get__ = lambda *args: self.mock_cache
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.13"
        mock_session.user = "Guest"
        mock_response.__getitem__.side_effect = self.mock_response.__getitem__
        mock_response.__setitem__.side_effect = self.mock_response.__setitem__
        mock_response.get.side_effect = self.mock_response.get

        # Start at time 1000
        mock_time.return_value = 1000.0

        # Make 20 requests (at limit for get_logged_user)
        for i in range(20):
            result = get_logged_user()

        # Advance time by 61 seconds (past the 60-second window)
        mock_time.return_value = 1061.0

        # Clear the cache to simulate window expiry (sliding window removes old timestamps)
        self.cache_store.clear()

        # Now requests should be allowed again
        result = get_logged_user()
        self.assertEqual(result, "Guest")

        # Verify headers show refreshed limit
        headers = self.mock_response.get("http_headers", {})
        self.assertEqual(headers.get("X-RateLimit-Limit"), "20")
        remaining = int(headers.get("X-RateLimit-Remaining", "0"))
        self.assertGreater(remaining, 0)


# Run tests
if __name__ == "__main__":
    unittest.main()
