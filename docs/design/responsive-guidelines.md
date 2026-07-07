# CipherLens Responsive Design Guidelines

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-05  
> **Status:** Active

---

## 1. Strategy: Mobile-First

CipherLens is built with a **mobile-first responsive strategy**. All base styles are written for mobile viewports, and larger breakpoints progressively enhance the layout. This means:

- Default (no prefix) Tailwind classes apply to all screen sizes.
- Prefixed classes (`md:`, `lg:`) override defaults at and above the specified breakpoint.
- Media queries use `min-width` logic.

> [!NOTE]
> While most users access CipherLens from a desktop, mobile-first ensures that dashboards and reports degrade gracefully on smaller screens — important for on-call security teams reviewing findings from mobile devices.

---

## 2. Breakpoint Reference

| Name | Prefix | Min-Width | Typical Target |
|---|---|---|---|
| (default) | — | 0px | Mobile phones (portrait) |
| **sm** | `sm:` | 640px | Mobile phones (landscape), small tablets |
| **md** | `md:` | 768px | Tablets (portrait), large phones |
| **lg** | `lg:` | 1024px | Tablets (landscape), small laptops |
| **xl** | `xl:` | 1280px | Desktops, standard laptops |
| **2xl** | `2xl:` | 1536px | Wide desktops, large monitors |

### Tailwind Configuration

These match Tailwind's defaults. No override required unless adding a custom breakpoint:

```ts
// tailwind.config.ts
theme: {
  screens: {
    sm:  '640px',
    md:  '768px',
    lg:  '1024px',
    xl:  '1280px',
    '2xl': '1536px',
  },
}
```

---

## 3. Container System

### Max-Width Constraint

All page content is constrained to a maximum width of **1280px** (`max-w-screen-xl`) and centered horizontally. This prevents lines from becoming too wide on large monitors.

```tsx
// Standard page container — used inside SectionContainer
<div className="max-w-screen-xl mx-auto px-6 md:px-8 xl:px-12">
  {children}
</div>
```

### Horizontal Padding Scale

| Breakpoint | Side Padding | Total Margin |
|---|---|---|
| Default (mobile) | `px-4` (16px) | 32px total |
| `sm` (640px+) | `px-6` (24px) | 48px total |
| `md` (768px+) | `px-8` (32px) | 64px total |
| `xl` (1280px+) | `px-12` (48px) | 96px total |

---

## 4. Layout Grids

CipherLens uses a **12-column grid** concept implemented via Tailwind's `grid-cols-*` utilities. Common configurations:

### Feature Grid

```tsx
// 1 col mobile → 2 col tablet → 3 col desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {features.map((f) => <FeatureCard key={f.id} {...f} />)}
</div>
```

### Stat Cards Row

```tsx
// 1 col mobile → 2 col sm → 4 col desktop
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
  {stats.map((s) => <StatCard key={s.id} {...s} />)}
</div>
```

### Dashboard Two-Column

```tsx
// Full width mobile → 2/3 main + 1/3 sidebar on lg
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2">
    {/* Main content */}
  </div>
  <aside>
    {/* Sidebar */}
  </aside>
</div>
```

### Scan Results Master-Detail

```tsx
// Stacked mobile → side-by-side lg
<div className="flex flex-col lg:flex-row gap-6">
  <div className="w-full lg:w-80 flex-shrink-0">
    {/* Findings list */}
  </div>
  <div className="flex-1 min-w-0">
    {/* Finding detail */}
  </div>
</div>
```

---

## 5. Typography Responsiveness

Scale heading sizes down on mobile using responsive prefixes:

```tsx
// Hero heading
<h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold leading-tight">
  Audit Your Security Posture
</h1>

// Section heading
<h2 className="text-2xl sm:text-3xl font-heading font-semibold">
  Key Findings
</h2>

// Subtitle
<p className="text-base sm:text-md text-text-secondary leading-relaxed max-w-2xl">
  Detailed description here.
</p>
```

---

## 6. Navigation Responsiveness

### Mobile Navigation Pattern

Below `md` breakpoint, the primary navigation collapses into a hamburger menu drawer:

```tsx
// Navbar.tsx pattern
<nav className="sticky top-0 z-50 bg-bg-card border-b border-border">
  <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
    
    <Logo />

    {/* Desktop nav — hidden on mobile */}
    <div className="hidden md:flex items-center gap-8">
      <NavLinks />
      <NavActions />
    </div>

    {/* Mobile hamburger — visible only below md */}
    <button className="md:hidden" aria-label="Open navigation menu">
      <MenuIcon className="w-5 h-5" />
    </button>
  </div>

  {/* Mobile drawer — conditionally rendered */}
  <AnimatePresence>
    {mobileMenuOpen && (
      <motion.div
        variants={slideInRight}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="md:hidden fixed inset-y-0 right-0 w-72 bg-bg-card shadow-lg z-50 px-6 py-8"
      >
        <MobileNavLinks />
      </motion.div>
    )}
  </AnimatePresence>
</nav>
```

---

## 7. Table Responsiveness

Data tables do not reflow gracefully on mobile. Use one of these strategies:

### Strategy A: Horizontal Scroll

```tsx
<div className="overflow-x-auto rounded-xl border border-border">
  <table className="w-full min-w-[640px]">
    {/* Table content */}
  </table>
</div>
```

### Strategy B: Card Stack Below md

```tsx
{/* Show table on desktop, card list on mobile */}
<div className="hidden md:block">
  <DataTable findings={findings} />
</div>
<div className="md:hidden flex flex-col gap-3">
  {findings.map((f) => (
    <FindingCard key={f.id} finding={f} />
  ))}
</div>
```

---

## 8. Spacing Responsiveness

Section padding should scale with viewport:

```tsx
// Section vertical padding
<section className="py-16 md:py-20 xl:py-24">
  {/* Section content */}
</section>

// Content gap scales with available space
<div className="flex flex-col gap-8 md:gap-10 xl:gap-12">
  {children}
</div>
```

---

## 9. Image & Media Responsiveness

All images must be responsive:

```tsx
// Always include width and height to prevent layout shift
<img
  src="/images/dashboard-preview.png"
  alt="CipherLens dashboard showing scan results"
  className="w-full h-auto rounded-xl shadow-md"
  width={1280}
  height={720}
  loading="lazy"
/>
```

---

## 10. Breakpoint Testing Checklist

Before marking any feature complete, verify the layout at:

- [ ] **375px** — iPhone SE / small phones
- [ ] **390px** — iPhone 14 / modern phones
- [ ] **768px** — iPad portrait / `md` breakpoint
- [ ] **1024px** — iPad landscape / `lg` breakpoint
- [ ] **1280px** — Standard desktop / `xl` breakpoint
- [ ] **1536px** — Wide desktop / `2xl` breakpoint

> [!TIP]
> Use Chrome DevTools responsive mode or Playwright's viewport configuration to quickly test all breakpoints.

---

## 11. Usage Rules

### DO ✅

- Start every component and layout with the mobile layout first, then add `md:` and `lg:` overrides.
- Use `max-w-screen-xl mx-auto` for all content containers.
- Use `overflow-x-auto` on table wrappers for horizontal scroll on small screens.
- Scale heading sizes responsively using breakpoint prefixes.
- Test the hamburger menu drawer and all touch targets at 375px.

### DON'T ❌

- Do not use `sm:hidden` to hide entire page sections on mobile — degrade gracefully instead.
- Do not use fixed pixel widths on layout containers — use `max-w-*` and `w-full`.
- Do not rely on `hover:` states as the only way to reveal critical information — hover doesn't exist on touch devices.
- Do not let lines of body text exceed ~75 characters (`max-w-prose`) on large viewports.
