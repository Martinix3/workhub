# Plan: Integración Email en Mi Día para TDAH

## Visión

**"Un stream unificado de atención"** - emails y tareas mezclados como items iguales, ordenados por prioridad. La IA ayuda a:
1. Priorizar qué necesita atención AHORA
2. Saber cuándo puedes desconectar sin culpa
3. Proteger tiempo libre y para otros proyectos

---

## Diseño: Items Unificados

### Nuevo tipo: `ActionItem`

```typescript
type ActionItemType = 'task' | 'email'

interface ActionItem {
  id: string
  type: ActionItemType
  priority: 'P0' | 'P1' | 'P2'
  title: string
  subtitle?: string           // proyecto para tareas, remitente para emails
  status: 'DOING' | 'NEXT' | 'BLOCKED'
  due_date?: string

  // Solo para emails
  email?: {
    from: string
    fromName: string
    threadId: string
    snippet: string
    suggestedTask?: {
      title: string
      description: string
    }
  }

  // Solo para tareas
  task?: Task
}
```

### Visual: Tarjetas Idénticas

```
┌─────────────────────────────────────────────────────┐
│ [P0] Ventas                              📧         │  ← Icono indica tipo
│ Responder cotización urgente a Pharma SA            │
│ De: Juan Pérez • hace 2h                            │
│                                    [✓ Hecho] [→]    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ [P0] Producción                          ✓         │  ← Checkbox = tarea
│ Revisar orden de fabricación #1234                  │
│ Proyecto: Lote Enero                                │
│                                    [▶ Focus]        │
└─────────────────────────────────────────────────────┘
```

**Diferencias visuales mínimas:**
- Icono 📧 (Mail) vs ✓ (checkbox) en la esquina
- Subtítulo: "De: Nombre" vs "Proyecto: X"
- Acciones: Email tiene "Hecho" (descarta) + "→" (crear tarea)

---

## Ordenamiento Inteligente

```typescript
function sortActionItems(items: ActionItem[]): ActionItem[] {
  return items.sort((a, b) => {
    // 1. Prioridad primero (P0 > P1 > P2)
    const priorityOrder = { P0: 0, P1: 1, P2: 2 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }

    // 2. Dentro de misma prioridad: DOING > NEXT > resto
    const statusOrder = { DOING: 0, NEXT: 1, BLOCKED: 2 }
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status]
    }

    // 3. Más antiguo primero (urgencia temporal)
    return new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime()
  })
}
```

---

## Flujo de Interacción

### Email → Tarea (1 clic)

```
Usuario ve email P0 mezclado con tareas
    ↓
Click en [→] (flecha)
    ↓
Modal pre-rellenado aparece:
  - Título: sugerido por Gemini
  - Prioridad: heredada del email
  - Descripción: "Re: [asunto] - [snippet]"
    ↓
Usuario confirma (o ajusta)
    ↓
Tarea creada, email desaparece del stream
```

### Email → Descartado (1 clic)

```
Usuario ve email que no requiere acción
    ↓
Click en [✓ Hecho]
    ↓
Email desaparece (guardado como procesado)
    ↓
No vuelve a aparecer
```

### Focus Mode (igual que ahora)

El Focus Mode funciona igual para tareas. Para emails NO hay focus mode - primero se convierte en tarea.

---

## Indicador de "Puedes Desconectar"

### Nuevo componente: `DisconnectIndicator`

```
┌──────────────────────────────────────────┐
│  ☀️  Puedes desconectar                  │
│  No hay P0 pendientes. 2 P1 pueden       │
│  esperar hasta mañana.                   │
└──────────────────────────────────────────┘
```

**Lógica:**
```typescript
function canDisconnect(items: ActionItem[]): {
  canDisconnect: boolean
  reason: string
} {
  const p0Items = items.filter(i => i.priority === 'P0' && i.status !== 'DONE')
  const p1Urgent = items.filter(i =>
    i.priority === 'P1' &&
    i.due_date &&
    isToday(i.due_date)
  )

  if (p0Items.length > 0) {
    return {
      canDisconnect: false,
      reason: `${p0Items.length} urgente(s) pendiente(s)`
    }
  }

  if (p1Urgent.length > 0) {
    return {
      canDisconnect: false,
      reason: `${p1Urgent.length} para hoy`
    }
  }

  const p1Count = items.filter(i => i.priority === 'P1').length
  return {
    canDisconnect: true,
    reason: p1Count > 0
      ? `${p1Count} P1 pueden esperar hasta mañana`
      : 'Todo al día 🎉'
  }
}
```

**Ubicación:** Encima de las stats cards, visible pero no intrusivo.

---

## Archivos a Modificar/Crear

### Nuevos archivos:

```
web/src/
  components/sections/tasks/
    ActionItemCard.tsx        # Card unificada (reemplaza TaskCard para esta vista)
    DisconnectIndicator.tsx   # Indicador de "puedes desconectar"
  api/
    hooks/
      useActionItems.ts       # Combina tareas + emails clasificados
    services/
      gmail.ts                # Añadir: getActionableEmails(), dismissEmail()
  types/
    action-item.ts            # Tipos ActionItem, ActionItemType
```

### Modificar:

```
web/src/
  components/sections/tasks/
    MyDay.tsx                 # Usar ActionItemCard, añadir DisconnectIndicator
  pages/tasks/
    MyDayPage.tsx             # Usar useActionItems en lugar de useMyDay solo
```

### Backend (Frappe):

```
frappe-app/workhub_frappe_app/
  api/
    gmail.py                  # Añadir: get_actionable_emails(), dismiss_email()
  doctype/
    email_interaction/        # Nueva tabla para tracking dismissed/converted
```

---

## Implementación por Fases

### Fase 1: Infraestructura (Backend)
1. Crear doctype `Email Interaction` (user, email_id, status, task_link)
2. Endpoint `get_actionable_emails()` - emails clasificados como P0/P1
3. Endpoint `dismiss_email()` - marcar como procesado
4. Endpoint `convert_email_to_task()` - crear tarea y vincular

### Fase 2: Tipos y Hook
1. Crear tipos `ActionItem`
2. Crear `useActionItems()` que combina:
   - `useMyDay()` existente
   - Nuevo `useActionableEmails()`
3. Función de ordenamiento unificado

### Fase 3: Componentes UI
1. `ActionItemCard` - card unificada con variantes task/email
2. `DisconnectIndicator` - indicador de estado
3. Modal de conversión email → tarea (reutilizar QuickAdd existente)

### Fase 4: Integración
1. Integrar en `MyDay.tsx`
2. Reemplazar lista de tareas por lista de `ActionItem`
3. Añadir `DisconnectIndicator` en header

### Fase 5: Polish
1. Animaciones de entrada/salida
2. Sonido/feedback al desconectar
3. Persistencia de preferencias

---

## Límites TDAH-Friendly

| Concepto | Límite | Razón |
|----------|--------|-------|
| Emails visibles | Max 5 | No abrumar |
| P0 simultáneos | Alerta si >3 | Sobrecarga |
| Refresh automático | Cada 5 min | No distraer |
| Notificaciones | Solo P0 nuevos | Proteger atención |

---

## Resumen Visual Final

```
┌─────────────────────────────────────────────────────────────┐
│ Mi Día                           Lunes, 20 de Enero         │
├─────────────────────────────────────────────────────────────┤
│  ☀️ Puedes desconectar - 2 P1 pueden esperar               │  ← NUEVO
├─────────────────────────────────────────────────────────────┤
│ [Hoy: 7] [Vencidas: 0] [Bloqueadas: 1] [Completadas: 5]    │
├─────────────────────────────────────────────────────────────┤
│ EN PROGRESO                                                 │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [P0] Producción                         ✓    [▶ Focus] ││  ← Tarea
│ │ Revisar lote #234                                       ││
│ └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ SIGUIENTE                                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [P1] Ventas                             📧   [✓] [→]   ││  ← Email
│ │ Cotización para Pharma Labs                             ││
│ │ De: Juan Pérez • hace 1h                                ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [P1] Compras                            ✓    [▶]       ││  ← Tarea
│ │ Confirmar pedido proveedor                              ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [P2] Admin                              📧   [✓] [→]   ││  ← Email
│ │ Revisar contrato actualizado                            ││
│ │ De: Legal SA • hace 3h                                  ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Permisos Bash Necesarios

- Ninguno para esta implementación (todo es código TypeScript/Python)
