#!/usr/bin/env bash
# =============================================================
# WorkHub Data Import - Importador TDAH-friendly
# =============================================================
#
# USO:
#   ./scripts/import-data.sh              # Importar todo
#   ./scripts/import-data.sh --dry-run    # Ver qué se importaría (sin crear nada)
#   ./scripts/import-data.sh clientes     # Solo clientes
#   ./scripts/import-data.sh productos    # Solo productos
#
# PREREQUISITOS:
#   1. Pon tus CSVs en: apps/workhub/data/
#   2. Nombres esperados:
#      - 01_clientes.csv
#      - 02_distribuidores.csv
#      - 03_productos.csv
#      - 04_ventas.csv
#
# =============================================================

set -euo pipefail

WORKHUB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BENCH_PATH="${WORKHUB_ROOT}/../../frappe-bench"
SITE="${SITE:-workhub.localhost}"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     WORKHUB DATA IMPORT              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# Verificar que existe frappe-bench
if [[ ! -d "${BENCH_PATH}" ]]; then
    echo -e "${RED}ERROR: No se encontró frappe-bench en ${BENCH_PATH}${NC}"
    echo "Asegúrate de que el bench está instalado."
    exit 1
fi

# Verificar que existen CSVs
DATA_DIR="${WORKHUB_ROOT}/data"
TEMPLATES_DIR="${DATA_DIR}/templates"

if [[ ! -d "${DATA_DIR}" ]]; then
    echo -e "${YELLOW}Creando directorio data/...${NC}"
    mkdir -p "${DATA_DIR}"
fi

# Copiar templates si no hay CSVs en data/
if [[ -d "${TEMPLATES_DIR}" ]]; then
    for template in "${TEMPLATES_DIR}"/*.csv; do
        if [[ -f "$template" ]]; then
            basename=$(basename "$template")
            target="${DATA_DIR}/${basename}"
            if [[ ! -f "$target" ]]; then
                echo -e "${YELLOW}Copiando template: ${basename}${NC}"
                cp "$template" "$target"
            fi
        fi
    done
fi

# Parsear argumentos
DRY_RUN=""
WHAT="all"

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN='{"dry_run": true}'
            echo -e "${YELLOW}Modo DRY RUN - No se crearán documentos${NC}"
            echo ""
            ;;
        clientes)
            WHAT="clientes"
            ;;
        distribuidores)
            WHAT="distribuidores"
            ;;
        productos)
            WHAT="productos"
            ;;
        ventas)
            WHAT="ventas"
            ;;
        *)
            ;;
    esac
done

# Ejecutar importación
cd "${BENCH_PATH}"

if [[ "$WHAT" == "all" ]]; then
    echo "Importando TODO (distribuidores → clientes → productos → ventas)..."
    echo ""
    if [[ -n "$DRY_RUN" ]]; then
        bench --site "${SITE}" execute workhub_frappe_app.api.data_import.import_all --kwargs "${DRY_RUN}"
    else
        bench --site "${SITE}" execute workhub_frappe_app.api.data_import.import_all
    fi
else
    echo "Importando solo: ${WHAT}..."
    echo ""

    case $WHAT in
        clientes)
            FUNC="import_customers"
            ;;
        distribuidores)
            FUNC="import_distributors"
            ;;
        productos)
            FUNC="import_products"
            ;;
        ventas)
            FUNC="import_sales"
            ;;
    esac

    if [[ -n "$DRY_RUN" ]]; then
        bench --site "${SITE}" execute "workhub_frappe_app.api.data_import.${FUNC}" --kwargs "${DRY_RUN}"
    else
        bench --site "${SITE}" execute "workhub_frappe_app.api.data_import.${FUNC}"
    fi
fi

echo ""
echo -e "${GREEN}¡Listo!${NC}"
echo ""
