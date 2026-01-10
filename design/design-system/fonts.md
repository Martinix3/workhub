# Typography Configuration

## Google Fonts Import

Add to your HTML `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
```

Or in CSS:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@600;700&display=swap');
```

## Font Usage

| Font | Use Case | CSS Property |
|------|----------|--------------|
| **Playfair Display** | Headings, logo, section titles | `font-family: 'Playfair Display', serif;` |
| **Inter** | Body text, buttons, labels, navigation | `font-family: 'Inter', system-ui, sans-serif;` |
| **JetBrains Mono** | KPI numbers, order codes, technical data | `font-family: 'JetBrains Mono', monospace;` |

## Typography Scale

```css
/* Heading sizes (Playfair Display) */
h1 { font-size: 2.25rem; }  /* 36px */
h2 { font-size: 1.875rem; } /* 30px */
h3 { font-size: 1.5rem; }   /* 24px */
h4 { font-size: 1.25rem; }  /* 20px */

/* KPI numbers (JetBrains Mono) */
.kpi-hero { font-size: 3rem; }    /* 48px */
.kpi-large { font-size: 2.25rem; } /* 36px */
.kpi-medium { font-size: 1.5rem; } /* 24px */

/* Body sizes (Inter) */
.text-base { font-size: 1rem; }      /* 16px */
.text-sm { font-size: 0.875rem; }    /* 14px */
.text-xs { font-size: 0.75rem; }     /* 12px */
```

## Font Weight Guidelines

| Weight | Tailwind | Use Case |
|--------|----------|----------|
| 400 | `font-normal` | Body text, descriptions |
| 500 | `font-medium` | Navigation items, labels |
| 600 | `font-semibold` | Buttons, emphasis |
| 700 | `font-bold` | Headings, KPIs |

## Styling Examples

### Page Title (Playfair Display)
```html
<h1 class="font-heading text-4xl font-bold text-slate-900">
  Dashboard de Ventas
</h1>
```

### KPI Number (JetBrains Mono)
```html
<span class="font-mono text-5xl font-bold">
  $847,000
</span>
```

### Body Text (Inter)
```html
<p class="font-body text-sm text-stone-600">
  Pedidos activos este mes
</p>
```

### Sidebar Logo
```html
<span class="font-heading text-xl font-bold tracking-tight text-white">
  SANTA BRISA
</span>
```

### Table Headers
```html
<th class="font-body text-xs font-semibold uppercase tracking-wide text-stone-500">
  Cliente
</th>
```

### Order Code
```html
<code class="font-mono text-sm text-slate-700">
  SAL-ORD-2025-00015
</code>
```
