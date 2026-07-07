# CipherLens Spacing System

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-05  
> **Status:** Active

---

## 1. Philosophy

CipherLens uses an **8px base grid** for all spacing decisions. Every spacing value is a multiple of 4px (the half-step), ensuring pixel-perfect alignment across all components and layouts. Consistency in spacing creates visual rhythm and reduces the cognitive load of scanning dense security data.

> [!IMPORTANT]
> Never use arbitrary pixel values for margin, padding, or gap. Always select the nearest value from the spacing scale below.

---

## 2. Spacing Scale

| Token | CSS Variable | px | rem | Tailwind Class | Usage Description |
|---|---|---|---|---|---|
| `xs` | `--spacing-xs` | 4px | 0.25rem | `p-1`, `m-1`, `gap-1` | Hairline gaps, icon padding, badge inner spacing |
| `sm` | `--spacing-sm` | 8px | 0.5rem | `p-2`, `m-2`, `gap-2` | Tight component padding, list item gaps |
| `md` | `--spacing-md` | 16px | 1rem | `p-4`, `m-4`, `gap-4` | Default component padding, form field spacing |
| `lg` | `--spacing-lg` | 24px | 1.5rem | `p-6`, `m-6`, `gap-6` | Card padding, section inner spacing |
| `xl` | `--spacing-xl` | 32px | 2rem | `p-8`, `m-8`, `gap-8` | Section separation, large card padding |
| `2xl` | `--spacing-2xl` | 48px | 3rem | `p-12`, `m-12`, `gap-12` | Major section gaps, hero spacing |
| `3xl` | `--spacing-3xl` | 96px | 6rem | `p-24`, `m-24`, `gap-24` | Page-level top/bottom padding, hero sections |

---

## 3. CSS Custom Properties

```css
:root {
  --spacing-xs:  0.25rem;   /*  4px */
  --spacing-sm:  0.5rem;    /*  8px */
  --spacing-md:  1rem;      /* 16px */
  --spacing-lg:  1.5rem;    /* 24px */
  --spacing-xl:  2rem;      /* 32px */
  --spacing-2xl: 3rem;      /* 48px */
  --spacing-3xl: 6rem;      /* 96px */
}
```

---

## 4. Usage by Context

### 4.1 Component Internal Padding

| Component Size | Padding | Tailwind |
|---|---|---|
| Small (Badge, Tag) | 4px × 8px | `py-1 px-2` |
| Medium (Button, Input) | 8px × 16px | `py-2 px-4` |
| Large (Button lg, Select) | 12px × 24px | `py-3 px-6` |
| Card (compact) | 16px | `p-4` |
| Card (default) | 24px | `p-6` |
| Card (spacious) | 32px | `p-8` |

### 4.2 Layout & Section Spacing

| Context | Vertical Spacing | Horizontal Spacing |
|---|---|---|
| Section container padding | 96px (`--spacing-3xl`) top/bottom | — |
| Between page sections | 48px (`--spacing-2xl`) | — |
| Between section elements | 32px (`--spacing-xl`) | — |
| Grid column gap | — | 24px (`--spacing-lg`) |
| Grid row gap | 24px (`--spacing-lg`) | — |
| Stacked form fields | 16px (`--spacing-md`) | — |
| Inline form groups | — | 8px (`--spacing-sm`) |

### 4.3 Icon & Label Spacing

| Context | Spacing | Tailwind |
|---|---|---|
| Icon left of text | 8px gap | `gap-2` |
| Icon inside button | 8px gap | `gap-2` |
| Avatar beside name | 12px gap | `gap-3` |
| Stacked label + value | 4px gap | `gap-1` |

---

## 5. Practical Examples

### SectionContainer

```tsx
// SectionContainer applies vertical padding using the 3xl spacing token
<section className="py-24 px-6">          {/* py-24 = 96px = --spacing-3xl */}
  <div className="max-w-7xl mx-auto">
    {children}
  </div>
</section>
```

### Card with Default Padding

```tsx
<div className="bg-bg-card rounded-lg border border-border p-6"> {/* p-6 = 24px = --spacing-lg */}
  <h3 className="text-lg font-semibold mb-4">             {/* mb-4 = 16px = --spacing-md */}
    Card Title
  </h3>
  <p className="text-text-secondary text-sm leading-relaxed">
    Card body content here.
  </p>
</div>
```

### Feature Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">  {/* gap-6 = 24px = --spacing-lg */}
  {features.map((feature) => (
    <FeatureCard key={feature.id} {...feature} />
  ))}
</div>
```

### Navigation Bar

```tsx
<nav className="px-6 py-4">                               {/* px-6=24px, py-4=16px */}
  <div className="flex items-center gap-8">               {/* gap-8=32px between nav groups */}
    <Logo />
    <NavLinks className="flex gap-6" />                   {/* gap-6=24px between nav items */}
    <NavActions className="flex items-center gap-3" />    {/* gap-3=12px between action buttons */}
  </div>
</nav>
```

### Form Field Stack

```tsx
<form className="flex flex-col gap-4">                    {/* gap-4 = 16px between fields */}
  <div className="flex flex-col gap-1">                   {/* gap-1 = 4px label→input */}
    <label className="text-sm font-medium text-text-secondary">
      Target URL
    </label>
    <input className="px-4 py-2.5 rounded-md border border-border" /> {/* px-4=16px, py-2.5=10px */}
  </div>
  <button className="px-6 py-3 mt-2">                    {/* mt-2=8px extra top margin */}
    Start Scan
  </button>
</form>
```

---

## 6. Half-Step Values (Non-Token)

When a half-step is needed between defined tokens, Tailwind's default scale provides:

| Need | Value | Tailwind |
|---|---|---|
| Between xs and sm | 6px | `p-1.5`, `gap-1.5` |
| Between sm and md | 10px | `p-2.5`, `gap-2.5` |
| Between sm and md | 12px | `p-3`, `gap-3` |
| Between md and lg | 20px | `p-5`, `gap-5` |

These are acceptable when a named token is too large or too small, but should be used sparingly.

---

## 7. Usage Rules

### DO ✅

- Use `--spacing-lg` (24px / `p-6`) as the default card padding.
- Use `--spacing-3xl` (96px / `py-24`) for section-level vertical rhythm.
- Use `gap-*` in flex/grid containers rather than individual `margin` on children.
- Use `--spacing-md` (16px) as the default gap between stacked form elements.

### DON'T ❌

- Do not use arbitrary Tailwind sizes like `p-7`, `p-9`, `p-11` — stick to the defined scale.
- Do not use negative margins to "fix" alignment issues — fix the layout structure.
- Do not mix `margin` and `gap` in the same container to control item spacing.
- Do not use pixel values directly in component `style` props for spacing.
