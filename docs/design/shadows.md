# CipherLens Shadow System

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-05  
> **Status:** Active

---

## 1. Philosophy

Shadows in CipherLens communicate **elevation and focus**, not decoration. The system uses three named shadow levels, each calibrated to the warm ivory background color (`#FAFAF7`). Shadows use a warm-tinted umbra (not pure black) to blend naturally with the palette.

> [!NOTE]
> All shadow colors are derived from `hsl(40, 20%, 10%)` — a warm, dark tone that avoids the cold blue-gray cast of generic black shadows.

---

## 2. Shadow Token Reference

### Shadow Subtle — `--shadow-sm`

```css
--shadow-sm: 0 1px 3px rgba(60, 50, 30, 0.08),
             0 1px 2px rgba(60, 50, 30, 0.05);
```

| Property | Value |
|---|---|
| **Token** | `--shadow-sm` |
| **Tailwind** | `shadow-sm` (override in config) |
| **Elevation** | Level 1 — Near-surface |
| **Character** | Barely perceptible, whisper-light |

**When to use:**
- Default card resting state on the primary background
- Input fields and form controls at rest
- Table rows on hover
- Inactive stat cards
- Badges and chips

---

### Shadow Medium — `--shadow-md`

```css
--shadow-md: 0 4px 12px rgba(60, 50, 30, 0.10),
             0 2px 6px  rgba(60, 50, 30, 0.07);
```

| Property | Value |
|---|---|
| **Token** | `--shadow-md` |
| **Tailwind** | `shadow-md` (override in config) |
| **Elevation** | Level 2 — Raised |
| **Character** | Clearly visible, soft diffusion |

**When to use:**
- Cards on hover state (transition from `--shadow-sm`)
- Dropdowns and select menus
- Popover panels
- Secondary modals / side panels
- Feature cards and service tiles

---

### Shadow Large — `--shadow-lg`

```css
--shadow-lg: 0 10px 30px rgba(60, 50, 30, 0.12),
             0  4px 12px rgba(60, 50, 30, 0.08),
             0  1px  4px rgba(60, 50, 30, 0.05);
```

| Property | Value |
|---|---|
| **Token** | `--shadow-lg` |
| **Tailwind** | `shadow-lg` (override in config) |
| **Elevation** | Level 3 — Floating |
| **Character** | Prominent depth, well-diffused |

**When to use:**
- Primary modal dialogs
- Toast / notification panels
- Sticky navigation bar (on scroll)
- Command palette
- Draggable items (when being dragged)

---

## 3. CSS Custom Property Declarations

```css
:root {
  --shadow-sm: 0 1px 3px rgba(60, 50, 30, 0.08),
               0 1px 2px rgba(60, 50, 30, 0.05);

  --shadow-md: 0 4px 12px rgba(60, 50, 30, 0.10),
               0 2px  6px rgba(60, 50, 30, 0.07);

  --shadow-lg: 0 10px 30px rgba(60, 50, 30, 0.12),
               0  4px 12px rgba(60, 50, 30, 0.08),
               0  1px  4px rgba(60, 50, 30, 0.05);
}
```

---

## 4. Tailwind Configuration Override

Override Tailwind's default shadow utilities in `tailwind.config.ts`:

```ts
// tailwind.config.ts
theme: {
  extend: {
    boxShadow: {
      sm: 'var(--shadow-sm)',
      md: 'var(--shadow-md)',
      lg: 'var(--shadow-lg)',
      // Keep Tailwind's default 'none' and 'inner'
    },
  },
}
```

---

## 5. Elevation Interaction Patterns

Shadows should respond to interaction to communicate state clearly:

### Card Hover Elevation

```tsx
// Card elevates from sm to md shadow on hover
<div
  className="
    bg-bg-card border border-border rounded-lg p-6
    shadow-sm
    transition-shadow duration-200 ease-in-out
    hover:shadow-md
  "
>
  {/* Card content */}
</div>
```

### Framer Motion Hover (preferred for cards with animations)

```tsx
import { motion } from 'framer-motion';

<motion.div
  className="bg-bg-card border border-border rounded-lg p-6 shadow-sm"
  whileHover={{
    boxShadow: 'var(--shadow-md)',
    y: -2,
    transition: { duration: 0.2, ease: 'easeOut' }
  }}
>
  {/* Card content */}
</motion.div>
```

### Modal — Always Level 3

```tsx
<div
  className="fixed inset-0 z-50 flex items-center justify-center"
  role="dialog"
  aria-modal="true"
>
  <div className="bg-bg-overlay absolute inset-0" />
  <div className="relative bg-bg-card rounded-xl shadow-lg p-8 max-w-lg w-full mx-4">
    {/* Modal content */}
  </div>
</div>
```

### Navbar Scroll State

```tsx
// Apply shadow-lg to navbar when page is scrolled
const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  const handler = () => setScrolled(window.scrollY > 8);
  window.addEventListener('scroll', handler, { passive: true });
  return () => window.removeEventListener('scroll', handler);
}, []);

<nav className={`transition-shadow duration-300 ${scrolled ? 'shadow-lg' : 'shadow-none'}`}>
  {/* Navbar content */}
</nav>
```

---

## 6. Focus Ring Shadow

For accessible focus states, use a combination of outline and box-shadow:

```css
/* Accessible focus ring — not part of the elevation system but uses the same warm tones */
:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(196, 147, 63, 0.20); /* accent at 20% opacity */
}
```

---

## 7. Usage Rules

### DO ✅

- Use `shadow-sm` as the **default resting state** for all cards.
- Transition to `shadow-md` on hover using `transition-shadow duration-200`.
- Reserve `shadow-lg` for elements that float above all page content (modals, toasts, command palettes).
- Use the warm-tinted shadow values — do not use raw `shadow-black` or Tailwind defaults.

### DON'T ❌

- Do not apply `shadow-lg` to inline cards — it creates visual noise.
- Do not use `drop-shadow` (CSS filter) on UI containers — it bleeds through transparent areas.
- Do not layer multiple box-shadow values on a single element beyond what the tokens define.
- Do not use color-tinted glows (e.g., gold glow, red glow) on any element — this breaks the warm-neutral aesthetic.
- Do not animate shadows using keyframes — only use `transition-shadow` or Framer Motion `whileHover`.
