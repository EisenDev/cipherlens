# CipherLens Component Inventory

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-05  
> **Status:** Active

---

## 1. Overview

This document catalogs all reusable UI components in the CipherLens design system. Each entry documents the component's location, props API, design variants, and usage examples.

All components live in `frontend/src/components/` and follow:
- **TypeScript strict mode** — all props are explicitly typed.
- **Tailwind CSS** — no inline styles.
- **Framer Motion** — for any entrance or hover animation.
- **shadcn/ui primitives** — as the headless base where applicable.

---

## 2. Primitive Components

### 2.1 Button

**File:** `frontend/src/components/ui/Button.tsx`

The primary interactive element across the application. Built on a `<button>` element with four visual variants and three sizes.

#### Props API

```ts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant controlling color and style */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  /** Size controlling padding and font size */
  size?: 'sm' | 'md' | 'lg';
  /** When true, renders a full-width block button */
  fullWidth?: boolean;
  /** Optional leading icon element */
  leftIcon?: React.ReactNode;
  /** Optional trailing icon element */
  rightIcon?: React.ReactNode;
  /** When true, shows a loading spinner and disables interaction */
  loading?: boolean;
}
```

#### Variants

| Variant | Background | Text | Border | Use Case |
|---|---|---|---|---|
| `primary` | `--color-accent-primary` | White | None | Primary CTAs (Start Scan, Save) |
| `secondary` | `--color-bg-subtle` | `--color-text-primary` | None | Secondary actions (Cancel, Reset) |
| `ghost` | Transparent | `--color-text-secondary` | None | Tertiary actions, icon-only toolbar buttons |
| `outline` | Transparent | `--color-accent-primary` | `--color-accent-primary` | Alternative CTA, deemphasized primary |

#### Size Reference

| Size | Padding | Font | Height |
|---|---|---|---|
| `sm` | `px-3 py-1.5` | `text-sm` | 32px |
| `md` | `px-4 py-2` | `text-sm` | 40px |
| `lg` | `px-6 py-3` | `text-base` | 48px |

#### Usage Example

```tsx
import { Button } from '@/components/ui/Button';

// Primary CTA
<Button variant="primary" size="lg" leftIcon={<ShieldIcon />}>
  Start Security Scan
</Button>

// Destructive action (uses danger color with override)
<Button variant="outline" className="border-danger text-danger hover:bg-danger-bg">
  Delete Project
</Button>

// Loading state
<Button variant="primary" loading>
  Scanning...
</Button>
```

---

### 2.2 Badge

**File:** `frontend/src/components/ui/Badge.tsx`

Small label chip used to communicate status, severity, or categorical classification.

#### Props API

```ts
interface BadgeProps {
  /** Display label */
  label: string;
  /** Color variant maps to semantic colors */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  /** Optional leading icon */
  icon?: React.ReactNode;
  /** Size of the badge */
  size?: 'sm' | 'md';
}
```

#### Variant Color Mapping

| Variant | Background | Text |
|---|---|---|
| `default` | `--color-bg-subtle` | `--color-text-secondary` |
| `success` | `--color-success-bg` | `--color-success` |
| `warning` | `--color-warning-bg` | `--color-warning` |
| `danger` | `--color-danger-bg` | `--color-danger` |
| `info` | `--color-info-bg` | `--color-info` |
| `accent` | `--color-accent-primary-light` | `--color-accent-primary` |

#### Usage Example

```tsx
import { Badge } from '@/components/ui/Badge';

<Badge variant="danger" label="Critical" icon={<AlertTriangleIcon className="w-3 h-3" />} />
<Badge variant="success" label="Pass" />
<Badge variant="warning" label="Medium" />
```

---

### 2.3 Divider

**File:** `frontend/src/components/ui/Divider.tsx`

Horizontal or vertical separator for visual section breaks.

#### Props API

```ts
interface DividerProps {
  /** Axis of the divider line */
  orientation?: 'horizontal' | 'vertical';
  /** Optional center label text */
  label?: string;
  /** Spacing around divider */
  spacing?: 'sm' | 'md' | 'lg';
}
```

#### Usage Example

```tsx
import { Divider } from '@/components/ui/Divider';

// Simple horizontal rule
<Divider />

// Labeled divider (e.g., "OR" between login options)
<Divider label="or continue with" />

// Vertical divider in flex row
<div className="flex items-center gap-4">
  <span>Item A</span>
  <Divider orientation="vertical" />
  <span>Item B</span>
</div>
```

---

### 2.4 IconWrapper

**File:** `frontend/src/components/ui/IconWrapper.tsx`

Standardized container that wraps Lucide icons with consistent background, padding, and optional accent styling.

#### Props API

```ts
interface IconWrapperProps {
  /** The icon element to render */
  icon: React.ReactNode;
  /** Background variant */
  variant?: 'subtle' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  /** Wrapper size */
  size?: 'sm' | 'md' | 'lg';
  /** Shape — square with rounded corners or circle */
  shape?: 'rounded' | 'circle';
}
```

#### Usage Example

```tsx
import { IconWrapper } from '@/components/ui/IconWrapper';
import { ShieldCheckIcon } from 'lucide-react';

<IconWrapper
  icon={<ShieldCheckIcon />}
  variant="success"
  size="md"
  shape="rounded"
/>
```

---

## 3. Layout Components

### 3.1 SectionContainer

**File:** `frontend/src/components/layout/SectionContainer.tsx`

The standard wrapper for all full-width page sections. Handles max-width constraint and consistent vertical padding.

#### Props API

```ts
interface SectionContainerProps {
  children: React.ReactNode;
  /** Background variant for the full-width section */
  background?: 'default' | 'subtle' | 'card' | 'dark';
  /** Whether to apply standard py-24 vertical padding */
  padded?: boolean;
  /** HTML id for scroll anchoring */
  id?: string;
  className?: string;
}
```

#### Usage Example

```tsx
import { SectionContainer } from '@/components/layout/SectionContainer';

<SectionContainer id="features" background="subtle">
  <SectionHeader
    eyebrow="Platform Capabilities"
    title="Everything You Need to Audit"
    subtitle="Comprehensive security scanning across your entire attack surface."
  />
  {/* Feature grid */}
</SectionContainer>
```

---

### 3.2 SectionHeader

**File:** `frontend/src/components/layout/SectionHeader.tsx`

Consistent eyebrow + heading + subtitle block used to open content sections.

#### Props API

```ts
interface SectionHeaderProps {
  /** Small ALL CAPS label above the title */
  eyebrow?: string;
  /** Main section heading (rendered as h2 by default) */
  title: string;
  /** Supporting paragraph below the title */
  subtitle?: string;
  /** Text alignment */
  align?: 'left' | 'center';
  /** HTML heading level for the title */
  headingLevel?: 2 | 3;
}
```

#### Usage Example

```tsx
<SectionHeader
  eyebrow="Security Reports"
  title="Audit Results at a Glance"
  subtitle="Findings are automatically prioritized by severity and presented with AI-generated remediation guidance."
  align="center"
/>
```

---

### 3.3 Navbar

**File:** `frontend/src/components/layout/Navbar.tsx`

Top navigation bar. Applies `shadow-lg` on scroll. Includes logo, navigation links, and action buttons.

#### Key Behaviors

- **Sticky positioned** (`position: sticky; top: 0; z-index: 50`)
- **Transparent → background** on scroll with `transition-all` for shadow
- **Mobile-responsive** with a hamburger menu drawer below `md` breakpoint
- **Active link state** using React Router's `useLocation`

---

### 3.4 Footer

**File:** `frontend/src/components/layout/Footer.tsx`

Page footer with logo, navigation links grouped by category, and legal copy.

#### Props API

```ts
interface FooterProps {
  /** Navigation link groups to render */
  linkGroups: Array<{
    heading: string;
    links: Array<{ label: string; href: string }>;
  }>;
}
```

---

### 3.5 LoginModal

**File:** `frontend/src/components/LoginModal.tsx`

Overlay login prompt centered on the screen. Features custom email/password input elements, Google/GitHub OAuth integrations, and a transparent dismissible backdrop layer.

#### Store State Dependency
This component is controlled globally via state variables inside the Zustand UI store [`useUIStore.ts`](file:///home/eisen/projects/random-proj/CipherLens/frontend/src/store/useUIStore.ts):
- `isLoginModalOpen: boolean` — controls visibility
- `closeLoginModal: () => void` — dismisses overlay

---

## 4. Content Components

### 4.1 Card

**File:** `frontend/src/components/ui/Card.tsx`

General-purpose content container. The workhorse of the CipherLens UI.

#### Props API

```ts
interface CardProps {
  children: React.ReactNode;
  /** Whether the card elevates on hover */
  hoverable?: boolean;
  /** Override default padding */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Visual border treatment */
  bordered?: boolean;
  className?: string;
}
```

#### Usage Example

```tsx
<Card hoverable bordered>
  <h4 className="text-lg font-semibold text-text-primary">Scan Result</h4>
  <p className="text-sm text-text-secondary mt-2">
    3 critical issues found
  </p>
</Card>
```

---

### 4.2 FeatureCard

**File:** `frontend/src/components/ui/FeatureCard.tsx`

Icon + title + description block for feature/capability listings.

#### Props API

```ts
interface FeatureCardProps {
  /** The wrapped icon element */
  icon: React.ReactNode;
  /** Icon wrapper color variant */
  iconVariant?: 'subtle' | 'accent' | 'success' | 'warning' | 'info';
  /** Card heading */
  title: string;
  /** Supporting description */
  description: string;
  /** Optional link for "Learn more" CTA */
  href?: string;
}
```

#### Usage Example

```tsx
<FeatureCard
  icon={<LockIcon />}
  iconVariant="accent"
  title="SSL/TLS Analysis"
  description="Detect expired certificates, weak cipher suites, and misconfigured HSTS policies."
/>
```

---

### 4.3 StatCard

**File:** `frontend/src/components/ui/StatCard.tsx`

Single metric display with a numeric value, label, and optional trend indicator.

#### Props API

```ts
interface StatCardProps {
  /** Primary metric value (can be number or formatted string) */
  value: string | number;
  /** Descriptive label */
  label: string;
  /** Optional supporting context */
  sublabel?: string;
  /** Optional trend indicator */
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
    positive: boolean;
  };
  /** Optional icon */
  icon?: React.ReactNode;
}
```

#### Usage Example

```tsx
<StatCard
  value="247"
  label="Total Scans"
  sublabel="Last 30 days"
  trend={{ direction: 'up', value: '+12%', positive: true }}
  icon={<ActivityIcon />}
/>
```

---

### 4.4 TimelineItem

**File:** `frontend/src/components/ui.tsx`

Chronological step or milestone card in page layouts, featuring a custom SVG icon indicator, a connecting line, title, and description. Used on the landing page and pipeline visualizers.

#### Props API

```ts
interface TimelineItemProps {
  /** The sequence number of the step (optional context) */
  step?: number;
  /** SVG icon element to render inside the highlighted circle */
  icon: React.ReactNode;
  /** Title of the milestone */
  title: string;
  /** Detailed description of the step */
  description: string;
  /** When true, suppresses the trailing horizontal connecting line */
  isLast?: boolean;
}
```

#### Usage Example

```tsx
import { TimelineItem } from '@/components/ui';

<TimelineItem
  icon={<TargetIcon />}
  title="1. Submit Target"
  description="Add a website URL or repository."
/>
```

---

## 5. Component Creation Guidelines

When creating a new component:

1. **Check this inventory first** — do not duplicate existing components.
2. **Create the file** in the appropriate subdirectory (`ui/`, `layout/`, `data/`).
3. **Write the TypeScript interface** before the implementation.
4. **Add TSDoc comments** to all props.
5. **Export from the barrel** — add to `frontend/src/components/index.ts`.
6. **Update this document** with the new component's specification.
7. **Write component tests** in `frontend/src/components/__tests__/`.
