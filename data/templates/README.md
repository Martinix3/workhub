# Templates de Importacion - WorkHub

## Como usar (3 pasos)

### 1. Abre en Google Sheets
- Sube cada CSV a Google Drive
- Abre con Google Sheets
- O importa directamente: `Archivo > Importar > Subir`

### 2. Llena tus datos
Borra los ejemplos y pega tus datos reales.

### 3. Exporta y ejecuta
```bash
# Exporta cada hoja como CSV (mismo nombre)
# Ponlos en: apps/workhub/data/

# Ejecuta:
cd apps/workhub
./scripts/import-data.py
```

---

## Archivos

| Archivo | Que contiene | Orden |
|---------|--------------|-------|
| `01_clientes.csv` | Clientes finales | 1ro |
| `02_distribuidores.csv` | Red de distribucion | 2do |
| `03_productos.csv` | Catalogo de items | 3ro |
| `04_ventas.csv` | Historico sell-in/sell-out | 4to |

---

## Columnas por archivo

### 01_clientes.csv
| Columna | Requerido | Descripcion |
|---------|-----------|-------------|
| nombre | Si | Nombre del cliente |
| email | No | Email de contacto |
| telefono | No | Telefono con codigo pais |
| zona | No | Territorio/region |
| tipo | Si | `directo` o `distribuidor` |
| distribuidor_asignado | No | Codigo del distribuidor (ej: DIST-001) |

### 02_distribuidores.csv
| Columna | Requerido | Descripcion |
|---------|-----------|-------------|
| codigo | Si | ID unico (ej: DIST-001) |
| nombre | Si | Nombre de la distribuidora |
| email | No | Email de contacto |
| telefono | No | Telefono |
| territorio | Si | Zona que cubre |
| comision_porcentaje | No | % de comision (ej: 15) |

### 03_productos.csv
| Columna | Requerido | Descripcion |
|---------|-----------|-------------|
| codigo | Si | SKU unico (ej: MEZCAL-JOV-750) |
| nombre | Si | Nombre del producto |
| grupo | No | Categoria (ej: Mezcal) |
| unidad | Si | UOM: Botella, Caja, Litro, etc |
| precio_unitario | Si | Precio de venta |
| es_item_venta | Si | `si` o `no` |
| tiene_lote | No | `si` si requiere tracking de lote |

### 04_ventas.csv
| Columna | Requerido | Descripcion |
|---------|-----------|-------------|
| tipo | Si | `sell_in` o `sell_out` |
| fecha | Si | YYYY-MM-DD |
| cliente | Si | Nombre o codigo del cliente |
| producto | Si | Codigo del producto |
| cantidad | Si | Unidades vendidas |
| precio_unitario | Si | Precio por unidad |
| distribuidor | Solo sell_out | Codigo del distribuidor |

---

## Tips

- **Orden importa**: Importa en orden 1-2-3-4
- **Codigos**: Usa codigos simples (DIST-001, MEZCAL-JOV-750)
- **Fechas**: Formato YYYY-MM-DD (2025-12-01)
- **Numeros**: Sin simbolos de moneda ni comas (1200, no $1,200)
