# Unit tests for WorkHub Rate Limiter
# Tests the Redis-based rate limiting system with sliding window algorithm

import unittest
import time
import json
from unittest.mock import Mock, patch, MagicMock
import frappe
from frappe.test_runner import make_test_records

# Import the rate limiter module
from workhub_frappe_app.api.rate_limiter import (
    RateLimiter,
    get_rate_limit_key,
    check_rate_limit,
    increment_rate_limit,
    get_client_ip,
    rate_limit,
)


class TestRateLimiter(unittest.TestCase):
    """Test cases for RateLimiter class"""

    def setUp(self):
        """Set up test fixtures before each test"""
        self.mock_cache = Mock()
        self.limiter = RateLimiter(limit=5, window=60)
        self.limiter.cache = self.mock_cache

    def test_initialization(self):
        """Test RateLimiter class initialization"""
        limiter = RateLimiter(limit=10, window=120)
        self.assertEqual(limiter.limit, 10)
        self.assertEqual(limiter.window, 120)
        self.assertIsNotNone(limiter.cache)

    def test_check_and_increment_first_request(self):
        """Test first request is always allowed"""
        # Mock Redis to return empty list (no previous requests)
        self.mock_cache.get_value.return_value = "[]"

        allowed, remaining, reset_time = self.limiter.check_and_increment("test_key")

        # First request should be allowed
        self.assertTrue(allowed)
        self.assertEqual(remaining, 4)  # 5 limit - 1 used = 4 remaining
        self.assertIsInstance(reset_time, int)

        # Verify Redis was called
        self.mock_cache.get_value.assert_called_once_with("test_key")
        self.mock_cache.set_value.assert_called_once()

    def test_check_and_increment_within_limit(self):
        """Test requests within limit are allowed"""
        current_time = time.time()
        # Mock 3 previous requests within window
        previous_timestamps = [current_time - 30, current_time - 20, current_time - 10]
        self.mock_cache.get_value.return_value = json.dumps(previous_timestamps)

        allowed, remaining, reset_time = self.limiter.check_and_increment("test_key")

        # Should be allowed (3 + 1 = 4 < 5 limit)
        self.assertTrue(allowed)
        self.assertEqual(remaining, 1)  # 5 - 4 = 1 remaining

    def test_check_and_increment_exceeds_limit(self):
        """Test request that exceeds limit is blocked"""
        current_time = time.time()
        # Mock 5 previous requests (at the limit)
        previous_timestamps = [
            current_time - 50,
            current_time - 40,
            current_time - 30,
            current_time - 20,
            current_time - 10,
        ]
        self.mock_cache.get_value.return_value = json.dumps(previous_timestamps)

        allowed, remaining, reset_time = self.limiter.check_and_increment("test_key")

        # Should be blocked (already at 5/5 limit)
        self.assertFalse(allowed)
        self.assertEqual(remaining, 0)

        # Verify Redis was not updated (request was blocked)
        self.mock_cache.set_value.assert_not_called()

    def test_sliding_window_old_requests_removed(self):
        """Test that requests outside the time window are removed"""
        current_time = time.time()
        window = 60  # 60 seconds window

        # Mock 3 old requests (outside window) and 2 recent requests (inside window)
        previous_timestamps = [
            current_time - 120,  # Old (2 min ago)
            current_time - 90,   # Old (1.5 min ago)
            current_time - 80,   # Old (1.3 min ago)
            current_time - 30,   # Recent (30s ago)
            current_time - 10,   # Recent (10s ago)
        ]
        self.mock_cache.get_value.return_value = json.dumps(previous_timestamps)

        allowed, remaining, reset_time = self.limiter.check_and_increment("test_key")

        # Should be allowed (only 2 recent + 1 new = 3 < 5 limit)
        self.assertTrue(allowed)
        self.assertEqual(remaining, 2)  # 5 - 3 = 2 remaining

    def test_check_and_increment_redis_down_fails_open(self):
        """Test that rate limiter fails open when Redis is unavailable"""
        # Mock Redis to raise exception
        self.mock_cache.get_value.side_effect = Exception("Redis connection failed")

        with patch("frappe.log_error") as mock_log_error:
            allowed, remaining, reset_time = self.limiter.check_and_increment("test_key")

            # Should fail open (allow request)
            self.assertTrue(allowed)
            self.assertEqual(remaining, 5)  # Returns limit as remaining
            self.assertIsInstance(reset_time, int)

            # Verify error was logged
            mock_log_error.assert_called_once()

    def test_check_and_increment_invalid_json_in_redis(self):
        """Test handling of corrupted data in Redis"""
        # Mock Redis to return invalid JSON
        self.mock_cache.get_value.return_value = "invalid json {["

        allowed, remaining, reset_time = self.limiter.check_and_increment("test_key")

        # Should treat as first request and allow
        self.assertTrue(allowed)
        self.assertEqual(remaining, 4)  # 5 - 1 = 4 remaining

    def test_check_and_increment_reset_time_calculation(self):
        """Test that reset_time is calculated correctly"""
        current_time = time.time()
        oldest_timestamp = current_time - 50

        # Mock one request 50 seconds ago
        self.mock_cache.get_value.return_value = json.dumps([oldest_timestamp])

        allowed, remaining, reset_time = self.limiter.check_and_increment("test_key")

        # Reset time should be oldest_timestamp + window
        expected_reset = int(oldest_timestamp + self.limiter.window)
        self.assertEqual(reset_time, expected_reset)

    def test_check_and_increment_redis_expiry(self):
        """Test that Redis key has appropriate expiry set"""
        self.mock_cache.get_value.return_value = "[]"

        self.limiter.check_and_increment("test_key")

        # Verify set_value was called with expires_in_sec
        call_args = self.mock_cache.set_value.call_args
        self.assertEqual(call_args[0][0], "test_key")  # Key
        self.assertIsInstance(call_args[0][1], str)    # Value (JSON)
        self.assertEqual(call_args[1]["expires_in_sec"], 61)  # window + 1


class TestRateLimitHelperFunctions(unittest.TestCase):
    """Test cases for helper functions"""

    def test_get_rate_limit_key_basic(self):
        """Test basic rate limit key generation"""
        key = get_rate_limit_key("ip", "192.168.1.1")
        self.assertEqual(key, "rate_limit:ip:192.168.1.1")

    def test_get_rate_limit_key_with_endpoint(self):
        """Test rate limit key generation with endpoint"""
        key = get_rate_limit_key("user", "admin@example.com", "generate_api_token")
        self.assertEqual(key, "rate_limit:user:admin@example.com:generate_api_token")

    def test_get_rate_limit_key_user_type(self):
        """Test rate limit key for user-based limiting"""
        key = get_rate_limit_key("user", "john.doe@example.com")
        self.assertEqual(key, "rate_limit:user:john.doe@example.com")

    @patch("workhub_frappe_app.api.rate_limiter.RateLimiter")
    def test_check_rate_limit_wrapper(self, mock_limiter_class):
        """Test check_rate_limit convenience function"""
        # Mock the RateLimiter instance
        mock_instance = Mock()
        mock_instance.check_and_increment.return_value = (True, 5, 1234567890)
        mock_limiter_class.return_value = mock_instance

        allowed, remaining, reset_time = check_rate_limit("test_key", 10, 60)

        # Verify RateLimiter was initialized correctly
        mock_limiter_class.assert_called_once_with(10, 60)

        # Verify check_and_increment was called
        mock_instance.check_and_increment.assert_called_once_with("test_key")

        # Verify return values
        self.assertTrue(allowed)
        self.assertEqual(remaining, 5)
        self.assertEqual(reset_time, 1234567890)

    @patch("workhub_frappe_app.api.rate_limiter.check_rate_limit")
    def test_increment_rate_limit_alias(self, mock_check):
        """Test that increment_rate_limit is an alias for check_rate_limit"""
        mock_check.return_value = (True, 3, 1234567890)

        result = increment_rate_limit("test_key", 5, 30)

        mock_check.assert_called_once_with("test_key", 5, 30)
        self.assertEqual(result, (True, 3, 1234567890))


class TestGetClientIP(unittest.TestCase):
    """Test cases for get_client_ip function"""

    @patch("frappe.request")
    def test_get_client_ip_from_x_forwarded_for(self, mock_request):
        """Test IP extraction from X-Forwarded-For header"""
        mock_request.headers.get.return_value = "203.0.113.195, 70.41.3.18"
        mock_request.remote_addr = "10.0.0.1"

        ip = get_client_ip()

        # Should return first IP from X-Forwarded-For
        self.assertEqual(ip, "203.0.113.195")

    @patch("frappe.request")
    def test_get_client_ip_from_remote_addr(self, mock_request):
        """Test IP extraction from remote_addr when no X-Forwarded-For"""
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = "192.168.1.100"

        ip = get_client_ip()

        # Should return remote_addr
        self.assertEqual(ip, "192.168.1.100")

    @patch("frappe.request", None)
    def test_get_client_ip_no_request(self):
        """Test handling when no request context exists"""
        ip = get_client_ip()

        # Should return "unknown"
        self.assertEqual(ip, "unknown")

    @patch("frappe.request")
    def test_get_client_ip_x_forwarded_for_with_spaces(self, mock_request):
        """Test IP extraction with spaces in X-Forwarded-For"""
        mock_request.headers.get.return_value = " 198.51.100.178 , 203.0.113.1 "
        mock_request.remote_addr = "10.0.0.1"

        ip = get_client_ip()

        # Should return first IP with whitespace stripped
        self.assertEqual(ip, "198.51.100.178")

    @patch("frappe.request")
    def test_get_client_ip_no_remote_addr(self, mock_request):
        """Test handling when remote_addr is None"""
        mock_request.headers.get.return_value = None
        mock_request.remote_addr = None

        ip = get_client_ip()

        # Should return "unknown"
        self.assertEqual(ip, "unknown")


class TestRateLimitDecorator(unittest.TestCase):
    """Test cases for @rate_limit decorator"""

    def setUp(self):
        """Set up test fixtures"""
        # Create a test function to decorate
        @rate_limit(limit=5, window=60)
        def test_endpoint():
            return {"status": "success"}

        self.test_endpoint = test_endpoint

    @patch("workhub_frappe_app.api.rate_limiter.check_rate_limit")
    @patch("workhub_frappe_app.api.rate_limiter.get_client_ip")
    @patch("frappe.session")
    @patch("frappe.response", {})
    def test_decorator_allows_request_within_limit(self, mock_session, mock_get_ip, mock_check):
        """Test decorator allows requests within rate limit"""
        # Mock IP and rate limit check
        mock_get_ip.return_value = "192.168.1.1"
        mock_check.return_value = (True, 4, 1234567890)  # Allowed, 4 remaining

        # Call decorated function
        result = self.test_endpoint()

        # Should execute successfully
        self.assertEqual(result, {"status": "success"})

        # Verify rate limit was checked
        mock_check.assert_called_once()

    @patch("workhub_frappe_app.api.rate_limiter.check_rate_limit")
    @patch("workhub_frappe_app.api.rate_limiter.get_client_ip")
    @patch("frappe.session")
    @patch("frappe.response", {})
    @patch("frappe.throw")
    def test_decorator_blocks_request_over_limit(self, mock_throw, mock_session, mock_get_ip, mock_check):
        """Test decorator blocks requests that exceed rate limit"""
        # Mock IP and rate limit check (blocked)
        mock_get_ip.return_value = "192.168.1.1"
        mock_check.return_value = (False, 0, 1234567890)  # Not allowed, 0 remaining

        # Mock frappe.throw to raise an exception
        mock_throw.side_effect = frappe.RateLimitExceededError("Rate limit exceeded")

        # Call decorated function - should raise exception
        with self.assertRaises(frappe.RateLimitExceededError):
            self.test_endpoint()

        # Verify frappe.throw was called
        mock_throw.assert_called_once()

    @patch("workhub_frappe_app.api.rate_limiter.check_rate_limit")
    @patch("workhub_frappe_app.api.rate_limiter.get_client_ip")
    @patch("frappe.session")
    @patch("frappe.response", {"http_headers": {}})
    def test_decorator_sets_rate_limit_headers(self, mock_session, mock_get_ip, mock_check):
        """Test decorator sets proper rate limit headers"""
        # Mock IP and rate limit check
        mock_get_ip.return_value = "192.168.1.1"
        mock_check.return_value = (True, 3, 1234567890)

        # Call decorated function
        self.test_endpoint()

        # Verify headers were set
        headers = frappe.response["http_headers"]
        self.assertEqual(headers["X-RateLimit-Limit"], "5")
        self.assertEqual(headers["X-RateLimit-Remaining"], "3")
        self.assertEqual(headers["X-RateLimit-Reset"], "1234567890")

    @patch("workhub_frappe_app.api.rate_limiter.check_rate_limit")
    @patch("frappe.session")
    @patch("frappe.response", {})
    def test_decorator_uses_user_identifier(self, mock_session, mock_check):
        """Test decorator uses user identifier when specified"""
        # Create function with user-based rate limiting
        @rate_limit(limit=10, window=60, identifier="user")
        def user_endpoint():
            return {"status": "success"}

        # Mock authenticated user
        mock_session.user = "admin@example.com"
        mock_check.return_value = (True, 9, 1234567890)

        # Call decorated function
        result = user_endpoint()

        # Verify check_rate_limit was called with user-based key
        call_args = mock_check.call_args[0]
        key = call_args[0]
        self.assertIn("user:admin@example.com", key)

    @patch("workhub_frappe_app.api.rate_limiter.check_rate_limit")
    @patch("workhub_frappe_app.api.rate_limiter.get_client_ip")
    @patch("frappe.session")
    @patch("frappe.response", {})
    def test_decorator_guest_user_falls_back_to_ip(self, mock_session, mock_get_ip, mock_check):
        """Test decorator falls back to IP for Guest users even with user identifier"""
        # Create function with user-based rate limiting
        @rate_limit(limit=10, window=60, identifier="user")
        def user_endpoint():
            return {"status": "success"}

        # Mock Guest user
        mock_session.user = "Guest"
        mock_get_ip.return_value = "192.168.1.1"
        mock_check.return_value = (True, 9, 1234567890)

        # Call decorated function
        result = user_endpoint()

        # Verify check_rate_limit was called with IP-based key (not user)
        call_args = mock_check.call_args[0]
        key = call_args[0]
        self.assertIn("ip:192.168.1.1", key)

    @patch("workhub_frappe_app.api.rate_limiter.check_rate_limit")
    @patch("workhub_frappe_app.api.rate_limiter.get_client_ip")
    @patch("frappe.session")
    @patch("frappe.response", {})
    def test_decorator_custom_endpoint_name(self, mock_session, mock_get_ip, mock_check):
        """Test decorator uses custom endpoint name in key"""
        # Create function with custom endpoint name
        @rate_limit(limit=5, window=60, endpoint="custom_endpoint")
        def some_function():
            return {"status": "success"}

        mock_get_ip.return_value = "192.168.1.1"
        mock_check.return_value = (True, 4, 1234567890)

        # Call decorated function
        some_function()

        # Verify check_rate_limit was called with custom endpoint name
        call_args = mock_check.call_args[0]
        key = call_args[0]
        self.assertIn(":custom_endpoint", key)

    @patch("workhub_frappe_app.api.rate_limiter.check_rate_limit")
    @patch("workhub_frappe_app.api.rate_limiter.get_client_ip")
    @patch("frappe.session")
    @patch("frappe.response", {"http_headers": {}})
    @patch("frappe.throw")
    @patch("time.time")
    def test_decorator_sets_retry_after_header(self, mock_time, mock_throw, mock_session, mock_get_ip, mock_check):
        """Test decorator sets Retry-After header on 429 response"""
        # Mock current time and rate limit check
        mock_time.return_value = 1234567850
        mock_get_ip.return_value = "192.168.1.1"
        mock_check.return_value = (False, 0, 1234567890)  # Reset at 1234567890

        # Mock frappe.throw
        mock_throw.side_effect = frappe.RateLimitExceededError("Rate limit exceeded")

        # Call decorated function
        with self.assertRaises(frappe.RateLimitExceededError):
            self.test_endpoint()

        # Verify Retry-After header was set
        headers = frappe.response["http_headers"]
        self.assertEqual(headers["Retry-After"], "40")  # 1234567890 - 1234567850 = 40 seconds

        # Verify HTTP status code was set
        self.assertEqual(frappe.response["http_status_code"], 429)


class TestRateLimiterIntegration(unittest.TestCase):
    """Integration tests for rate limiter with actual sliding window behavior"""

    @patch("time.time")
    def test_sliding_window_integration(self, mock_time):
        """Test complete sliding window behavior over time"""
        mock_cache = Mock()
        limiter = RateLimiter(limit=3, window=10)  # 3 requests per 10 seconds
        limiter.cache = mock_cache

        # Time 0: First request
        mock_time.return_value = 1000.0
        mock_cache.get_value.return_value = "[]"
        allowed, remaining, _ = limiter.check_and_increment("test_key")
        self.assertTrue(allowed)
        self.assertEqual(remaining, 2)

        # Time 2: Second request
        mock_time.return_value = 1002.0
        mock_cache.get_value.return_value = json.dumps([1000.0])
        allowed, remaining, _ = limiter.check_and_increment("test_key")
        self.assertTrue(allowed)
        self.assertEqual(remaining, 1)

        # Time 4: Third request (at limit)
        mock_time.return_value = 1004.0
        mock_cache.get_value.return_value = json.dumps([1000.0, 1002.0])
        allowed, remaining, _ = limiter.check_and_increment("test_key")
        self.assertTrue(allowed)
        self.assertEqual(remaining, 0)

        # Time 6: Fourth request (exceeds limit)
        mock_time.return_value = 1006.0
        mock_cache.get_value.return_value = json.dumps([1000.0, 1002.0, 1004.0])
        allowed, remaining, _ = limiter.check_and_increment("test_key")
        self.assertFalse(allowed)
        self.assertEqual(remaining, 0)

        # Time 11: Fifth request (first request expired, should be allowed)
        mock_time.return_value = 1011.0
        mock_cache.get_value.return_value = json.dumps([1000.0, 1002.0, 1004.0])
        allowed, remaining, _ = limiter.check_and_increment("test_key")
        self.assertTrue(allowed)  # 1000.0 is now outside the 10-second window
        self.assertEqual(remaining, 0)  # 2 requests still in window + this one = 3 (at limit)


# Run tests
if __name__ == "__main__":
    unittest.main()
