# Order Detail Side Panel - Implementación

## Fecha: 2 Enero 2026

## Resumen

Implementación de un Side Panel in-page para ver/editar pedidos, reemplazando la navegación externa a Frappe que rompía el flujo TDAH-friendly.

## Problema Anterior

Los botones "Ver" (ojo) y "Editar" (libreta) en `/ventas/pedidos` abrían Frappe en una pestaña externa:

```tsx
// ANTES - Rompía el flujo
const handleViewOrder = (id: string) => {
  window.open(`${FRAPPE_URL}/app/sales-order/${id}`, '_blank')
}
```

## Solución Implementada

Side Panel que desliza desde la derecha con toda la información del pedido editable in-page.

## Archivos Creados

### 1. SidePanel Base Component
**`src/components/ui/SidePanel.tsx`**

Componente reutilizable para paneles laterales:
- Desliza desde la derecha con animación
- Overlay semi-transparente clickeable para cerrar
- Soporte ESC para cerrar
- Bloquea scroll del body cuando está abierto
- Tres tamaños: `md` (500px), `lg` (700px), `xl` (800px)

```tsx
<SidePanel
  isOpen={isOpen}
  onClose={handleClose}
  title="Título del Panel"
  width="lg"
>
  {children}
</SidePanel>
```

### 2. OrderDetailPanel
**`src/components/sections/sell-in-operations/OrderDetailPanel/`**

Estructura:
```
OrderDetailPanel/
├── index.tsx    # Componente principal
└── types.ts     # TypeScript interfaces
```

#### Características:
- **Header**: Número de orden + Status badge (Borrador, Confirmado, En Tránsito, etc.)
- **Sección Cliente**: Muestra cliente seleccionado, botón "Cambiar" (si editable)
- **Toggle SELL IN / SELL OUT**: Con indicador de distribuidor asignado
- **Tabla de Productos**:
  - Controles +/- para cantidad
  - Precio unitario y total por línea
  - Botón X para eliminar item
- **Resumen**: Subtotal, IVA 16%, Total
- **Footer**:
  - "Cancelar Pedido" (solo draft/confirmed)
  - "Descartar" / "Cerrar"
  - "Guardar" (solo si hay cambios)

#### Estados:
- Loading con spinner
- Error state
- Indicador "Cambios sin guardar"
- Confirmación antes de descartar cambios

## Archivo Modificado

### OrderListPage.tsx
**`src/pages/OrderListPage.tsx`**

Cambios:
1. Importa `OrderDetailPanel`
2. Añade estado para el panel:
   ```tsx
   const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
   const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
   ```
3. Reemplaza `window.open()` por apertura del panel:
   ```tsx
   const handleViewOrder = (id: string) => {
     setSelectedOrderId(id)
     setIsDetailPanelOpen(true)
   }
   ```
4. Renderiza el panel:
   ```tsx
   <OrderDetailPanel
     orderId={selectedOrderId}
     isOpen={isDetailPanelOpen}
     onClose={handleCloseDetailPanel}
     onSave={handleOrderSaved}
     onCancelOrder={handleCancelOrder}
   />
   ```

## Estilo Neobrutal Aplicado

- Bordes: `border-2 border-stone-900`
- Sin border-radius: `rounded-none`
- Sombras: `shadow-[4px_4px_0_#1c1917]`
- Accent color: `amber-400` / `amber-500`
- Secciones colapsables con iconos

## TODO / Próximos Pasos

1. **Conectar con API real**: Actualmente usa mock data
   - Endpoint `GET /api/orders/{id}` para cargar detalle
   - Endpoint `PUT /api/orders/{id}` para guardar cambios
   - Endpoint `POST /api/orders/{id}/cancel` para cancelar

2. **Búsqueda de productos**: El campo de búsqueda para añadir productos está presente pero no funcional

3. **Cambiar cliente**: El botón "Cambiar" existe pero no abre selector de cliente

4. **Form Design System**: Los componentes de formulario creados en `/design-os/src/components/forms/` pueden migrarse a workhub-app si se necesitan para otros formularios

## Notas Técnicas

- El panel usa `position: fixed` con `z-index: 50`
- La animación `slide-in-right` está definida inline con `<style>`
- El componente es auto-contenido (no depende de FormSection ni otros componentes externos)

## Testing

Verificado manualmente:
- ✅ Click en "Ver" abre el panel
- ✅ Click en "Editar" abre el panel
- ✅ ESC cierra el panel
- ✅ Click en overlay cierra el panel
- ✅ Controles +/- modifican cantidades
- ✅ Totales se recalculan automáticamente
- ✅ Toggle SELL IN/SELL OUT funciona
- ✅ Botón "Cerrar" funciona
