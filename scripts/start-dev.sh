#!/bin/bash
# Santa Brisa WorkHub - Script de desarrollo
# Inicia Frappe + Frontend con un solo comando

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Rutas
FRAPPE_BENCH="/Users/martinjaimesamperiz/santa brisa work hub/frappe-bench"
FRONTEND_DIR="/Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web"

# PIDs para cleanup
FRAPPE_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n${YELLOW}Deteniendo servicios...${NC}"

    if [ -n "$FRAPPE_PID" ]; then
        kill $FRAPPE_PID 2>/dev/null || true
    fi

    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi

    # Matar procesos de bench que puedan quedar
    pkill -f "bench start" 2>/dev/null || true

    echo -e "${GREEN}Servicios detenidos${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}  Santa Brisa WorkHub - Dev Mode  ${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# 1. Verificar que existe Frappe Bench
if [ ! -d "$FRAPPE_BENCH" ]; then
    echo -e "${RED}Error: No se encontró Frappe Bench en:${NC}"
    echo -e "${RED}$FRAPPE_BENCH${NC}"
    exit 1
fi

# 2. Verificar que existe el frontend
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: No se encontró el frontend en:${NC}"
    echo -e "${RED}$FRONTEND_DIR${NC}"
    exit 1
fi

# 3. Iniciar Frappe
echo -e "${YELLOW}[1/2] Iniciando Frappe en puerto 8001...${NC}"
cd "$FRAPPE_BENCH"
bench start > /tmp/frappe.log 2>&1 &
FRAPPE_PID=$!

# Esperar a que Frappe esté listo
echo -e "     Esperando a Frappe..."
for i in {1..30}; do
    if curl -s http://localhost:8001 > /dev/null 2>&1; then
        echo -e "     ${GREEN}Frappe listo${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "     ${YELLOW}Frappe tardando en iniciar, continuando...${NC}"
    fi
done

# 4. Iniciar Frontend
echo -e "${YELLOW}[2/2] Iniciando Frontend en puerto 5173...${NC}"
cd "$FRONTEND_DIR"
pnpm dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

# Esperar a que el frontend esté listo
sleep 3

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}  Servicios Iniciados  ${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "  Frontend:  ${GREEN}http://localhost:5173${NC}"
echo -e "  Frappe:    ${GREEN}http://localhost:8001${NC}"
echo ""
echo -e "  Logs:"
echo -e "    Frappe:   /tmp/frappe.log"
echo -e "    Frontend: /tmp/frontend.log"
echo ""
echo -e "${YELLOW}Presiona Ctrl+C para detener todos los servicios${NC}"
echo ""

# Esperar indefinidamente
wait
