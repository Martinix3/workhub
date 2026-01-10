#!/usr/bin/env bash
set -euo pipefail

PORT="${BFF_PORT:-7311}"
BASE="${BFF_BASE:-http://127.0.0.1:${PORT}}"

echo "[ops] bff: ${BASE}"
echo

curl -fsS "${BASE}/api/ops/status" | python3 /dev/fd/3 3<<'PY'
import json,sys
data=json.load(sys.stdin)
alerts=data.get("alerts") or []
metrics=data.get("metrics") or {}
sync=data.get("sync") or {}

print("metrics:")
print(f"- uptime_seconds: {metrics.get('uptime_seconds')}")
print(f"- requests_5m: {metrics.get('requests_5m')}  errors_5m_5xx: {metrics.get('errors_5m_5xx')}  p95_ms: {metrics.get('latency_ms_p95_5m')}")

print("sync:")
print(f"- last_success_at: {sync.get('last_success_at')}")
print(f"- consecutive_errors: {sync.get('consecutive_errors')}")
print(f"- last_error: {sync.get('last_error')}")

print("alerts:")
if not alerts:
    print("- (none)")
else:
    for a in alerts:
        print(f"- {a.get('severity')} {a.get('id')}: {a.get('title')} :: {a.get('detail')}")
PY
