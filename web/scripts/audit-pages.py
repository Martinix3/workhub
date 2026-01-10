#!/usr/bin/env python3
"""
Auditoría de páginas de tareas - Captura screenshots y DOM de cada página
"""

from playwright.sync_api import sync_playwright
import json
import os

PAGES = [
    {"name": "MyDay", "app_url": "http://localhost:5177/tareas", "design_url": "http://localhost:3100/sections/task-management/screen-designs/MyDay"},
    {"name": "ProjectList", "app_url": "http://localhost:5177/tareas/proyectos", "design_url": "http://localhost:3100/sections/task-management/screen-designs/ProjectList"},
    {"name": "Kanban", "app_url": "http://localhost:5177/tareas/kanban", "design_url": "http://localhost:3100/sections/task-management/screen-designs/KanbanBoard"},
    {"name": "Dashboard", "app_url": "http://localhost:5177/tareas/dashboard", "design_url": "http://localhost:3100/sections/task-management/screen-designs/KPIDashboard"},
]

OUTPUT_DIR = "/tmp/workhub-audit"

def audit_page(page, name, url, prefix):
    """Captura screenshot y elementos clave de una página"""
    print(f"\n{'='*60}")
    print(f"Auditando: {name} ({prefix})")
    print(f"URL: {url}")
    print(f"{'='*60}")

    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)  # Extra wait for React render

    # Screenshot
    screenshot_path = f"{OUTPUT_DIR}/{name}_{prefix}.png"
    page.screenshot(path=screenshot_path, full_page=True)
    print(f"Screenshot: {screenshot_path}")

    # Capturar elementos clave
    elements = {
        "buttons": [],
        "cards": [],
        "inputs": [],
        "headings": [],
        "stats": [],
    }

    # Botones
    for btn in page.locator("button").all():
        try:
            text = btn.inner_text()[:50] if btn.is_visible() else ""
            if text:
                elements["buttons"].append(text)
        except:
            pass

    # Cards (MUI Paper o divs con shadow)
    card_count = page.locator("[class*='MuiPaper'], [class*='MuiCard']").count()
    elements["cards"].append(f"{card_count} cards detectadas")

    # Inputs
    for inp in page.locator("input, textarea").all():
        try:
            placeholder = inp.get_attribute("placeholder") or ""
            if placeholder:
                elements["inputs"].append(placeholder[:30])
        except:
            pass

    # Headings
    for h in page.locator("h1, h2, h3, h4").all():
        try:
            text = h.inner_text()[:50] if h.is_visible() else ""
            if text:
                elements["headings"].append(text)
        except:
            pass

    # Stats/KPIs (números grandes)
    for stat in page.locator("[class*='stat'], [class*='kpi'], [class*='metric']").all():
        try:
            text = stat.inner_text()[:30] if stat.is_visible() else ""
            if text:
                elements["stats"].append(text)
        except:
            pass

    print(f"\nElementos detectados:")
    print(f"  Botones: {elements['buttons'][:5]}")
    print(f"  Cards: {elements['cards']}")
    print(f"  Inputs: {elements['inputs'][:3]}")
    print(f"  Headings: {elements['headings'][:5]}")

    return elements

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        for pg in PAGES:
            name = pg["name"]
            results[name] = {
                "app": audit_page(page, name, pg["app_url"], "app"),
                "design": audit_page(page, name, pg["design_url"], "design"),
            }

        browser.close()

    # Guardar resultados
    with open(f"{OUTPUT_DIR}/audit-results.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n\n{'='*60}")
    print("AUDITORÍA COMPLETADA")
    print(f"Resultados en: {OUTPUT_DIR}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
