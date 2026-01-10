# WorkHub - Puertos y URLs

## LA URL DE WORKHUB ES:

```
╔═══════════════════════════════════════════╗
║                                           ║
║   🌐  http://localhost:5177               ║
║                                           ║
╚═══════════════════════════════════════════╝
```

## METODO INFALIBLE (siempre funciona)

```bash
workhub
```

Este comando:
1. Si el servidor NO está corriendo → lo arranca automáticamente
2. Espera a que esté listo
3. Abre el navegador

**Otros comandos útiles:**
```bash
workhub status   # Ver si está corriendo
workhub stop     # Detener servidor
workhub restart  # Reiniciar todo
workhub logs     # Ver logs
wh               # Alias corto de workhub
```

## Accesos rápidos

| Método | Comando/Acción |
|--------|----------------|
| **Terminal (RECOMENDADO)** | `workhub` o `wh` |
| **Desktop** | Doble-click en `WorkHub.webloc` (requiere servidor) |
| **Directo** | http://localhost:5177 (requiere servidor) |

## Todos los puertos del ecosistema

| Servicio | Puerto | URL |
|----------|--------|-----|
| **WorkHub UI** | 5177 | http://localhost:5177 |
| Frappe Backend | 8001 | http://localhost:8001 |
| ERPNext | 7312 | http://workhub.localhost:7312 |
| Leantime | 7313 | http://localhost:7313 |

## Recordatorio

```
WORKHUB UI = 5177
WORKHUB UI = 5177
WORKHUB UI = 5177

COMANDO INFALIBLE = workhub
```

Puerto fijo, configurado en `web/vite.config.ts`.
Script infalible en `scripts/workhub`.
