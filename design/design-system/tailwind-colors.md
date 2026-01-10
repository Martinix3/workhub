# Tailwind Color Configuration

## Color Choices (Santa Brisa Brand)

- **Primary:** `amber` - Used for buttons, CTAs, active states (warm, golden, inviting)
- **Secondary:** `orange` - Used for accents, highlights, secondary elements
- **Neutral:** `stone` - Used for backgrounds, text, borders (warm gray)
- **Accent:** `cyan` - Used for links, info, interactive elements

## Tailwind Config

Add these to your `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Sidebar
        sidebar: {
          DEFAULT: '#1e293b',
          hover: '#334155',
          active: '#f5ce3e',
        },
        // Surface
        surface: {
          bg: '#fafaf8',
          card: '#ffffff',
        },
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        neobrutal: '4px 4px 0px #1e293b',
        'neobrutal-sm': '2px 2px 0px #1e293b',
      },
      borderRadius: {
        neobrutal: '0px',
      },
    },
  },
}
```

## Usage Examples

### Primary button (CTA)
```html
<button class="bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold
               border-2 border-slate-800 shadow-neobrutal
               hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-neobrutal-sm
               transition-all duration-75 uppercase tracking-wide">
  Nuevo Pedido
</button>
```

### KPI Card
```html
<div class="bg-white border-2 border-slate-800 shadow-neobrutal p-6
            hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-neobrutal-sm
            transition-all duration-75">
  <span class="font-mono text-5xl font-bold">847K</span>
  <span class="text-xs uppercase tracking-wide text-stone-500">Ventas del Mes</span>
</div>
```

### Status badges
```html
<!-- Active/Success -->
<span class="bg-green-100 text-green-800 border border-green-800 px-2 py-0.5 text-xs uppercase font-mono">
  Activo
</span>

<!-- Warning -->
<span class="bg-amber-100 text-amber-800 border border-amber-800 px-2 py-0.5 text-xs uppercase font-mono">
  Pendiente
</span>

<!-- Danger -->
<span class="bg-red-100 text-red-800 border border-red-800 px-2 py-0.5 text-xs uppercase font-mono">
  Urgente
</span>
```

### Sidebar navigation
```html
<nav class="bg-sidebar text-white">
  <!-- Active item -->
  <a class="bg-sidebar-active text-slate-900 font-medium">Dashboard</a>

  <!-- Normal item -->
  <a class="text-slate-300 hover:bg-sidebar-hover hover:text-white">Pedidos</a>
</nav>
```

## Color Semantics

| Use Case | Color | Tailwind Classes |
|----------|-------|------------------|
| Primary CTA | Amber 400 | `bg-amber-400 text-slate-900` |
| Secondary button | Stone 100 | `bg-stone-100 text-stone-800 border-stone-300` |
| Success | Green | `bg-green-100 text-green-800` |
| Warning | Amber | `bg-amber-100 text-amber-800` |
| Danger | Red | `bg-red-100 text-red-800` |
| Info | Cyan | `bg-cyan-100 text-cyan-800` |
| Neutral text | Stone 600 | `text-stone-600` |
| Muted text | Stone 400 | `text-stone-400` |
| Borders | Slate 800 | `border-slate-800` |
