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
