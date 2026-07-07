# CipherLens Design System

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-05  
> **Status:** Active

---

## 1. Overview

The CipherLens Design System is a curated collection of design decisions, reusable UI components, and engineering guidelines that govern the look, feel, and behavior of the CipherLens frontend. It ensures consistency, accessibility, and scalability across all surfaces of the product.

This is a **living document** — it evolves alongside the product. All frontend changes must align with, and if necessary extend, this system.

---

## 2. Design Philosophy

CipherLens is an **enterprise-grade defensive security auditing platform**. Its visual language should reflect that mission.

### Core Principles

| Principle | Description |
|---|---|
| **Warmth over Aggression** | Reject the "hacker green-on-black" aesthetic. CipherLens communicates trust, professionalism, and calm authority. |
| **Clarity First** | Every UI element serves a purpose. Reduce cognitive load through whitespace, hierarchy, and purposeful color. |
| **Accessible by Default** | All components meet WCAG 2.1 AA standards. Accessibility is a feature, not an afterthought. |
| **Motion with Meaning** | Animations communicate state changes and guide attention. Never animate for decoration alone. |
| **Data-Informed Density** | Security dashboards carry significant data. Components must handle high information density gracefully. |

### Visual Identity

- **Warm Ivory base** conveys approachability and cleanliness.
- **Muted Gold accents** suggest precision, expertise, and measured confidence.
- **Generous whitespace** communicates enterprise quality and reduces scanning fatigue.
- **Sharp, minimal typography** (Cormorant Garamond headings, Inter body) creates a refined, editorial feel.

---

## 3. Design Token Architecture

All design values are expressed as CSS custom properties defined in `frontend/src/index.css`. Components consume tokens, never raw values.

```
Design Tokens
├── Color Palette         → docs/design/color-palette.md
├── Typography            → docs/design/typography.md
├── Spacing               → docs/design/spacing.md
├── Shadows               → docs/design/shadows.md
├── Border Radius         → docs/design/border-radius.md
└── Motion / Animations   → docs/design/animations.md
```

### Token Naming Convention

```css
/* Format: --[category]-[name]-[variant] */
--color-primary-accent     /* color category, primary group, accent variant */
--spacing-md               /* spacing category, md size */
--shadow-lg                /* shadow category, large variant */
--radius-md                /* border-radius category, medium variant */
--font-heading             /* font category, heading role */
```

> [!IMPORTANT]
> Never hardcode a hex value, pixel size, or font family directly in a component. Always reference a CSS custom property or Tailwind design token.

---

## 4. Technology Stack Integration

The design system integrates with the following frontend technologies:

| Layer | Technology | Role |
|---|---|---|
| **Styling** | Tailwind CSS | Utility-first layout and spacing |
| **Theming** | CSS Custom Properties | Design token definitions |
| **Components** | shadcn/ui | Headless component primitives |
| **Animation** | Framer Motion | Declarative motion system |
| **Icons** | Lucide React | Consistent icon library |
| **Fonts** | Google Fonts (Inter, Cormorant Garamond) | Typography system |

---

## 5. Component Inventory

All reusable UI components are located in `frontend/src/components/`. See [components.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/components.md) for full specifications.

### Primitives

| Component | Path | Description |
|---|---|---|
| `Button` | `components/ui/Button.tsx` | Primary, secondary, ghost, and outline variants |
| `Badge` | `components/ui/Badge.tsx` | Status and label chips |
| `Divider` | `components/ui/Divider.tsx` | Horizontal / vertical separators |
| `IconWrapper` | `components/ui/IconWrapper.tsx` | Standardized icon container |

### Layout

| Component | Path | Description |
|---|---|---|
| `SectionContainer` | `components/layout/SectionContainer.tsx` | Max-width page section wrapper |
| `SectionHeader` | `components/layout/SectionHeader.tsx` | Eyebrow + title + subtitle block |
| `Navbar` | `components/layout/Navbar.tsx` | Top navigation bar |
| `Footer` | `components/layout/Footer.tsx` | Page footer |

### Content

| Component | Path | Description |
|---|---|---|
| `Card` | `components/ui/Card.tsx` | General-purpose content container |
| `FeatureCard` | `components/ui/FeatureCard.tsx` | Icon + title + description feature block |
| `StatCard` | `components/ui/StatCard.tsx` | Single metric display with label |
| `Timeline` | `components/ui/Timeline.tsx` | Chronological event list |

---

## 6. Usage Rules

### DO ✅

- Reference design tokens for all colors, spacing, and sizing.
- Use `SectionContainer` to wrap all full-width page sections.
- Use Framer Motion presets from [animations.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/animations.md).
- Respect the 8px grid defined in [spacing.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/spacing.md).
- Test every new component at all responsive breakpoints.
- Ensure all interactive elements have visible focus states.

### DON'T ❌

- Do not use `text-green-400` or neon/glowing color effects.
- Do not hardcode pixel values — use spacing tokens.
- Do not add animations that have no semantic purpose.
- Do not create one-off components for something already in the inventory.
- Do not skip ARIA attributes on interactive elements.

---

## 7. Related Documentation

| Document | Description |
|---|---|
| [color-palette.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/color-palette.md) | Full color token definitions and usage rules |
| [typography.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/typography.md) | Font families, type scale, and weights |
| [spacing.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/spacing.md) | 8px grid spacing system |
| [shadows.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/shadows.md) | Elevation shadow levels |
| [border-radius.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/border-radius.md) | Corner radius scale |
| [components.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/components.md) | Component inventory and API specifications |
| [animations.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/animations.md) | Framer Motion animation presets |
| [responsive-guidelines.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/responsive-guidelines.md) | Breakpoints and responsive strategy |
| [accessibility.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/accessibility.md) | WCAG AA compliance guidelines |

---

## 8. Contributing to the Design System

1. **Propose changes in an ADR** if adding a new token category or changing a fundamental decision.
2. **Update the relevant `docs/design/*.md` file** before or alongside code changes.
3. **Add or update component specifications** in [components.md](file:///home/eisen/projects/random-proj/CipherLens/docs/design/components.md).
4. **Test across all breakpoints** before marking as done.
5. **Changelog update** — record all system-level changes in [changelog.md](file:///home/eisen/projects/random-proj/CipherLens/docs/changelog/changelog.md).

> [!NOTE]
> Design system documentation is held to the same standard as production code. Outdated or incomplete design docs are treated as a build failure per the project's Definition of Done.
