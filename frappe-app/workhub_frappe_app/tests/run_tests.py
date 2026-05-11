#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Runner for WorkHub WorkLink Suggestions Feature
Runs all unit tests for document matcher and API endpoints
"""

import sys
import unittest
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


def run_all_tests():
    """Run all tests in the tests directory"""
    print("=" * 70)
    print("WorkLink Auto-Suggestions - Unit Tests")
    print("=" * 70)
    print()

    # Discover and run all tests in this directory
    loader = unittest.TestLoader()
    start_dir = os.path.dirname(__file__)
    suite = loader.discover(start_dir, pattern='test_*.py')

    # Run tests with verbose output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print()
    print("=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print()

    if result.wasSuccessful():
        print("✅ All tests passed!")
        return 0
    else:
        print("❌ Some tests failed!")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
