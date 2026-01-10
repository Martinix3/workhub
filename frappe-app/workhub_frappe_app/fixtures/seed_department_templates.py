"""
Seed Department Workflow Templates for WorkHub

Loads pre-built workflow templates for Sales, Operations, Production, and Marketing departments
from JSON fixture files into the database.

Ejecutar desde bench:
    bench --site <site> execute workhub_frappe_app.fixtures.seed_department_templates.load_department_templates

Para limpiar templates:
    bench --site <site> execute workhub_frappe_app.fixtures.seed_department_templates.clear_department_templates
"""

import frappe
import json
import os
from pathlib import Path


def get_fixtures_path():
    """Get the absolute path to the department_templates fixtures directory."""
    current_dir = Path(__file__).parent
    fixtures_dir = current_dir / "department_templates"
    return fixtures_dir


def load_templates_from_file(filename):
    """Load templates from a JSON fixture file."""
    fixtures_dir = get_fixtures_path()
    file_path = fixtures_dir / filename

    if not file_path.exists():
        frappe.throw(f"Fixture file not found: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        templates = json.load(f)

    return templates


def load_department_templates():
    """
    Load all department workflow templates from JSON fixtures into the database.

    This will:
    1. Clear existing department templates (optional - commented by default)
    2. Load templates from all 4 department JSON files
    3. Create WH Project Template records with their tasks
    """

    # Optional: Clear existing templates first (uncomment if needed)
    # clear_department_templates()

    fixture_files = [
        "sales_templates.json",
        "ops_templates.json",
        "production_templates.json",
        "mkt_templates.json"
    ]

    total_templates = 0
    total_tasks = 0

    print("\n" + "="*60)
    print("Loading Department Workflow Templates")
    print("="*60 + "\n")

    for fixture_file in fixture_files:
        try:
            print(f"Loading templates from {fixture_file}...")
            templates = load_templates_from_file(fixture_file)

            for template_data in templates:
                # Check if template already exists
                existing = frappe.db.exists("WH Project Template", template_data.get("template_name"))

                if existing:
                    print(f"  ⚠️  Template '{template_data.get('template_name')}' already exists - skipping")
                    continue

                # Extract tasks data before creating the document
                tasks_data = template_data.pop("tasks", [])

                # Create the template document
                template = frappe.get_doc({
                    "doctype": "WH Project Template",
                    **template_data
                })

                # Add tasks as child table rows
                for task_data in tasks_data:
                    template.append("tasks", task_data)

                # Insert the template
                template.insert()

                total_templates += 1
                total_tasks += len(tasks_data)

                print(f"  ✓ Created template: {template.template_name} ({len(tasks_data)} tasks)")

        except Exception as e:
            print(f"  ✗ Error loading {fixture_file}: {str(e)}")
            frappe.log_error(f"Error loading {fixture_file}", str(e))
            continue

    # Commit all changes
    frappe.db.commit()

    print("\n" + "="*60)
    print(f"✓ Successfully loaded {total_templates} templates with {total_tasks} total tasks")
    print("="*60 + "\n")

    return {
        "templates_loaded": total_templates,
        "tasks_loaded": total_tasks
    }


def clear_department_templates():
    """
    Remove all department workflow templates from the database.

    WARNING: This will delete ALL WH Project Template records.
    Use with caution in production environments.
    """

    print("\n" + "="*60)
    print("Clearing Department Workflow Templates")
    print("="*60 + "\n")

    # Get count before deletion
    count = frappe.db.count("WH Project Template")

    if count == 0:
        print("No templates to delete.")
        return

    # Delete all templates
    # Note: Child table records (tasks) will be automatically deleted due to CASCADE
    frappe.db.delete("WH Project Template")
    frappe.db.commit()

    print(f"✓ Deleted {count} templates\n")
    print("="*60 + "\n")

    return {"templates_deleted": count}


def reload_department_templates():
    """
    Clear all existing templates and reload from fixtures.

    This is a convenience function for development.
    """
    clear_department_templates()
    return load_department_templates()


if __name__ == "__main__":
    load_department_templates()
