from __future__ import annotations

from pathlib import Path

import frappe
from frappe.core.doctype.user.user import generate_keys


def _set_env_var(env_path: Path, key: str, value: str) -> None:
    env_path.parent.mkdir(parents=True, exist_ok=True)
    if env_path.exists():
        lines = env_path.read_text(errors="replace").splitlines()
    else:
        lines = []

    out: list[str] = []
    replaced = False
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            out.append(line)
            continue
        k, _ = line.split("=", 1)
        if k.strip() != key:
            out.append(line)
            continue
        out.append(f"{key}={value}")
        replaced = True

    if not replaced:
        if out and out[-1].strip():
            out.append("")
        out.append(f"{key}={value}")

    env_path.write_text("\n".join(out).rstrip() + "\n")


def ensure_frappe_api_token(*, env_path: str, user: str = "Administrator") -> dict[str, object]:
    """
    Genera (o rota) API Key/Secret y lo escribe en el .env de WorkHub.

    Importante:
    - Frappe usa auth: Authorization: token <api_key>:<api_secret>
    - No devuelve el secreto por stdout (para no filtrarlo en logs).
    """

    frappe.set_user("Administrator")
    keys = generate_keys(user=user)

    api_key = str(keys.get("api_key") or "").strip()
    api_secret = str(keys.get("api_secret") or "").strip()
    if not api_key or not api_secret:
        raise RuntimeError("No se pudieron generar API key/secret")

    token = f"{api_key}:{api_secret}"
    _set_env_var(Path(env_path), "FRAPPE_API_TOKEN", token)
    return {"ok": True, "user": user, "env_path": env_path}

