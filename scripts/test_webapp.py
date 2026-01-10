#!/usr/bin/env python3
"""
WorkHub Frappe App - Web Application Test
Tests the main pages and functionality of the workhub_frappe_app
"""

from playwright.sync_api import sync_playwright
import os

BASE_URL = os.environ.get("FRAPPE_URL", "http://localhost:8001")
SCREENSHOT_DIR = "/tmp/workhub_screenshots"

def ensure_screenshot_dir():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def test_homepage(page):
    """Test that the homepage loads correctly"""
    print(f"\n[TEST] Homepage: {BASE_URL}")
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # Take screenshot
    screenshot_path = f"{SCREENSHOT_DIR}/01_homepage.png"
    page.screenshot(path=screenshot_path, full_page=True)
    print(f"  Screenshot: {screenshot_path}")

    # Check page title
    title = page.title()
    print(f"  Title: {title}")

    # Check for login form or main content
    content = page.content()
    if "login" in content.lower() or "password" in content.lower():
        print("  Status: Login page detected")
        return "login_required"
    else:
        print("  Status: Main content loaded")
        return "ok"

def test_workhub_pages(page):
    """Test workhub custom pages"""
    pages_to_test = [
        "/workhub_marketing",
        "/workhub_ventas",
        "/workhub_operaciones",
    ]

    results = {}
    for path in pages_to_test:
        url = f"{BASE_URL}{path}"
        print(f"\n[TEST] Page: {path}")

        try:
            response = page.goto(url, wait_until="networkidle", timeout=10000)
            status = response.status if response else "no_response"
            print(f"  HTTP Status: {status}")

            # Take screenshot
            safe_name = path.replace("/", "_").strip("_")
            screenshot_path = f"{SCREENSHOT_DIR}/page_{safe_name}.png"
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"  Screenshot: {screenshot_path}")

            results[path] = {"status": status, "error": None}
        except Exception as e:
            print(f"  Error: {e}")
            results[path] = {"status": "error", "error": str(e)}

    return results

def discover_elements(page):
    """Discover interactive elements on the current page"""
    print("\n[DISCOVERY] Interactive elements on page:")

    # Buttons
    buttons = page.locator("button").all()
    print(f"  Buttons: {len(buttons)}")
    for i, btn in enumerate(buttons[:5]):  # First 5
        text = btn.text_content() or btn.get_attribute("aria-label") or "(no text)"
        print(f"    - {text[:50]}")

    # Links
    links = page.locator("a[href]").all()
    print(f"  Links: {len(links)}")
    for i, link in enumerate(links[:5]):  # First 5
        href = link.get_attribute("href") or ""
        text = link.text_content() or "(no text)"
        print(f"    - {text[:30]} -> {href[:50]}")

    # Forms
    forms = page.locator("form").all()
    print(f"  Forms: {len(forms)}")

    # Inputs
    inputs = page.locator("input").all()
    print(f"  Input fields: {len(inputs)}")

def main():
    print("=" * 60)
    print("WorkHub Frappe App - Web Application Test")
    print("=" * 60)

    ensure_screenshot_dir()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"  [CONSOLE] {msg.type}: {msg.text}") if msg.type == "error" else None)

        # Test 1: Homepage
        homepage_result = test_homepage(page)

        # Test 2: Discover elements on homepage
        discover_elements(page)

        # Test 3: Custom workhub pages
        if homepage_result != "login_required":
            page_results = test_workhub_pages(page)
        else:
            print("\n[SKIP] Skipping page tests - login required")
            page_results = {}

        browser.close()

    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Homepage: {homepage_result}")
    print(f"Screenshots saved to: {SCREENSHOT_DIR}")

    if page_results:
        print("\nPage Results:")
        for path, result in page_results.items():
            status = "OK" if result["status"] in [200, 302] else f"FAIL ({result['status']})"
            print(f"  {path}: {status}")

    print("\nDone!")

if __name__ == "__main__":
    main()
