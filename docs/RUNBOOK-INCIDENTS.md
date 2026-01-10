# Runbooks de incidentes (MVP)

Este documento es para **diagnosticar y recuperar** rápido sin improvisar.

## 0) Comandos rápidos
- Estado/alertas: `bash workhub/scripts/ops.sh`
- Smoke infra: `bash workhub/scripts/smoke.sh`
- Smokes funcionales:
  - PM: `bash workhub/scripts/fase-1-smoke.sh`
  - ERP: `bash workhub/scripts/fase-d-smoke.sh`
  - End-to-end: `bash workhub/scripts/fase-5-smoke.sh`

## 1) Sync caído o atrasado
**Síntomas**
- `ops.sh` muestra alerta `sync_stale`, `sync_consecutive_errors` o `sync_reconcile_errors`.

**Checklist**
1) Ver logs del sync: `docker compose -f workhub/docker-compose.yml logs --tail=200 sync`
2) Ver que Leantime/ERP responden: `bash workhub/scripts/smoke.sh`
3) Si `FRAPPE_MODE=live`:
   - Revisa token: `bash workhub/scripts/frappe-ensure-token.sh workhub.localhost`
4) Si aparece `sync_reconcile_errors`:
   - Revisa una tarea afectada en Leantime y confirma que la descripción contiene `WorkLinkId: <id>` (y que coincide con el WorkLink en Frappe).
   - Si es una tarea “legacy” sin metadata, añade `WorkLinkId: <id>` manualmente o recrea la tarea desde el portal para que se cree con contexto.
5) Reinicia sync: `docker compose -f workhub/docker-compose.yml restart sync`

**Validación**
- `bash workhub/scripts/ops.sh` (sin alertas)
- `bash workhub/scripts/fase-5-smoke.sh`

## 2) Error rate alto (BFF)
**Síntomas**
- `ops.sh` muestra `bff_error_rate_high`.

**Checklist**
1) Reproducir: abre portal y repite la acción (o usa el smoke que falle).
2) Mira el `rid` en el error del portal y busca en logs:
   - `docker compose -f workhub/docker-compose.yml logs --tail=300 bff | rg \"rid=<RID>\"`
3) Si el error viene de Leantime/Frappe:
   - valida servicios: `bash workhub/scripts/smoke.sh`
4) Mitigación:
   - reinicia BFF: `docker compose -f workhub/docker-compose.yml restart bff`

## 3) Backup + restore
### 3.1 Backup (local)
- `bash workhub/scripts/backup-local.sh`

Salida típica en `workhub/.backups/<timestamp>/`:
- `leantime/leantime.sql.gz` (dump MySQL)
- `frappe/*` (backups copiados si existe `frappe-bench`)
- `logs/*` (logs de workhub/leantime)
- `ops/sync_status.json`

### 3.2 Restore verificado (local, seguro)
- `bash workhub/scripts/backup-verify-leantime.sh`
  - Hace dump, restaura en una DB temporal y la borra.

### 3.3 Restore real (peligroso)
**Leantime**
- `gzip -dc <dump.sql.gz> | docker exec -i mysql_leantime sh -lc 'mysql -u root -p\"leantime\" leantime'`
- Luego: `docker compose -f leantime-master/.docker/docker-compose.yml restart leantime`

**Frappe**
- En el bench: `cd /Users/martinjaimesamperiz/santa brisa/frappe-bench`
- `bench --site workhub.localhost --force restore <path_to_sql_gz>`
- Si hay archivos: restaurar `files.tar` según runbook interno del bench.

## 4) Rotación de secretos (prod)
- Cambiar `SESSION_SECRET` (invalida sesiones).
- Rotar `FRAPPE_API_TOKEN` y `LEANTIME_API_KEY` en `workhub/.env`.
- Reiniciar: `docker compose -f workhub/docker-compose.yml up -d --build bff sync`
