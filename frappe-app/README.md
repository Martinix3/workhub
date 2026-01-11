# WorkHub Frappe App

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ESTE ES EL PROYECTO ACTIVO                             ║
║                                                           ║
║   UI principal de Santa Brisa integrada en Frappe        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## Como arrancar

```bash
cd /Users/martinjaimesamperiz/santabrisa/frappe-bench
bench start
```

## URLs

| Pagina | URL |
|--------|-----|
| Desk (home) | http://localhost:8001/app |
| Marketing | http://localhost:8001/workhub_marketing |
| Ventas | http://localhost:8001/workhub_ventas |
| Operaciones | http://localhost:8001/workhub_operaciones |
| Produccion | http://localhost:8001/workhub_produccion |
| Calidad | http://localhost:8001/workhub_calidad |
| Distribuidores | http://localhost:8001/workhub_distribuidores |
| Finanzas | http://localhost:8001/workhub_finanzas |
| Admin | http://localhost:8001/workhub_admin |

## Estructura

```
workhub_frappe_app/
├── api/                           # API endpoints
│   ├── auth.py                    # Authentication endpoints (rate-limited)
│   ├── admin.py                   # Admin/user management (rate-limited)
│   ├── rate_limiter.py            # Rate limiting module
│   └── RATE_LIMITING.md           # Rate limiting documentation
├── config/                        # Configuration
│   └── rate_limits.py             # Rate limit settings
├── public/
│   ├── js/
│   │   └── workhub.bundle.js      # Shell (sidebar, header, bottom nav)
│   └── css/
│       └── workhub.bundle.css     # Estilos del shell
├── templates/
│   └── workhub_base.html          # Template base para paginas www
├── www/
│   ├── workhub_marketing.html     # Template de la pagina
│   ├── workhub_marketing.py       # Controller (datos, permisos)
│   └── ...                        # Resto de paginas
└── hooks.py                       # Configuracion de la app
```

## Modificar paginas

1. **Editar contenido**: Modifica el `.html` correspondiente en `www/`
2. **Editar datos/logica**: Modifica el `.py` correspondiente en `www/`
3. **Editar shell (sidebar/header)**: Modifica `public/js/workhub.bundle.js`
4. **Editar estilos**: Modifica `public/css/workhub.bundle.css`

## Limpiar cache despues de cambios

```bash
bench --site workhub.localhost clear-cache
```

## API Rate Limiting

WorkHub implements Redis-based rate limiting on authentication and sensitive endpoints to prevent abuse. See [workhub_frappe_app/api/RATE_LIMITING.md](./workhub_frappe_app/api/RATE_LIMITING.md) for complete documentation including:

- Rate limiting configuration and strategy
- Endpoint-specific limits
- Client-side 429 response handling
- Monitoring and troubleshooting

**Quick reference:**
- Auth endpoints: 5-20 req/min per IP/user
- Admin endpoints: 10-20 req/min per user
- All limits enforce 60-second sliding window
- Graceful fallback if Redis unavailable

---

### Installation

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app workhub_frappe_app
```

### License

MIT

---

Ultima actualizacion: 2025-12-31
