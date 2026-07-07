# CipherLens Animation System

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-05  
> **Status:** Active

---

## 1. Philosophy

Animations in CipherLens serve a **functional purpose** — they communicate state, guide attention, and reinforce spatial relationships. Every animation should:

- **Reduce cognitive load** (e.g., stagger reveals help users parse lists)
- **Confirm interaction** (e.g., button press feedback)
- **Communicate hierarchy** (e.g., parent fades in before children stagger)

> [!IMPORTANT]
> Never animate for pure decoration. If removing an animation makes the UI equally clear, remove it.

All animations are implemented with **Framer Motion**. CSS transitions are acceptable for simple hover and focus states only.

---

## 2. Global Motion Settings

### Reduced Motion Respect

All animations must respect the `prefers-reduced-motion` media query:

```ts
// frontend/src/hooks/useReducedMotion.ts
import { useReducedMotion } from 'framer-motion';

export function useMotionPreference() {
  const prefersReduced = useReducedMotion();
  return {
    /** Pass to `transition` to conditionally disable duration */
    safeDuration: (ms: number) => (prefersReduced ? 0 : ms),
    /** When true, use instant state changes */
    isReduced: prefersReduced,
  };
}
```

### Base Transition Defaults

```ts
// frontend/src/lib/motion.ts
export const defaultTransition = {
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94], // Custom ease-out-quart
};

export const fastTransition = {
  duration: 0.2,
  ease: 'easeOut',
};

export const springTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 24,
};
```

---

## 3. Animation Presets

All presets are exported from `frontend/src/lib/motion.ts` and consumed as `variants` props on Framer Motion components.

### 3.1 Fade In

Fade content in from transparent. Use for modals, tooltips, overlays, and content that appears without directional context.

```ts
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};
```

**Usage:**
```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn } from '@/lib/motion';

<AnimatePresence>
  {isOpen && (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 bg-bg-overlay z-50"
    />
  )}
</AnimatePresence>
```

---

### 3.2 Slide Up

Slides content up while fading in. Primary entrance animation for page sections, cards, and feature lists.

```ts
export const slideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};
```

**Usage:**
```tsx
import { motion } from 'framer-motion';
import { slideUp } from '@/lib/motion';

<motion.div
  variants={slideUp}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: '-80px' }}
>
  <FeatureCard {...props} />
</motion.div>
```

---

### 3.3 Scale In

Scales content in from slightly smaller. Use for modals, dropdowns, popovers, and toast notifications.

```ts
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};
```

**Usage:**
```tsx
<AnimatePresence>
  {showModal && (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="bg-bg-card rounded-2xl shadow-lg p-8"
      role="dialog"
    />
  )}
</AnimatePresence>
```

---

### 3.4 Hover Elevation

Lifts a card slightly on hover with shadow upgrade. The standard card hover animation.

```ts
export const hoverElevation = {
  rest: {
    y: 0,
    boxShadow: 'var(--shadow-sm)',
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  hover: {
    y: -4,
    boxShadow: 'var(--shadow-md)',
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};
```

**Usage:**
```tsx
<motion.div
  variants={hoverElevation}
  initial="rest"
  whileHover="hover"
  className="bg-bg-card border border-border rounded-xl p-6 cursor-pointer"
>
  {children}
</motion.div>
```

---

### 3.5 Button Hover & Press

Subtle scale feedback for buttons confirming interaction.

```ts
export const buttonMotion = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.15, ease: 'easeOut' } },
  tap:   { scale: 0.97, transition: { duration: 0.1,  ease: 'easeIn' } },
};
```

**Usage:**
```tsx
<motion.button
  variants={buttonMotion}
  initial="rest"
  whileHover="hover"
  whileTap="tap"
  className="px-6 py-3 bg-accent text-white rounded-lg font-medium"
>
  Start Scan
</motion.button>
```

---

### 3.6 Stagger Children

Used on a parent container to orchestrate sequential child entrance animations. Pair with `slideUp` or `fadeIn` on the children.

```ts
export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren:  0.1,  // 100ms between each child
      delayChildren:    0.15, // 150ms delay before first child
    },
  },
};

/** Convenience: stagger with a faster cadence for dense lists */
export const staggerFast = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren:   0.1,
    },
  },
};
```

**Usage:**
```tsx
<motion.div
  variants={staggerContainer}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: '-60px' }}
  className="grid grid-cols-1 md:grid-cols-3 gap-6"
>
  {features.map((feature) => (
    <motion.div key={feature.id} variants={slideUp}>
      <FeatureCard {...feature} />
    </motion.div>
  ))}
</motion.div>
```

---

### 3.7 Slide In from Left / Right

Used for panel reveals (sidebars, drawers, step wizards).

```ts
export const slideInLeft = {
  hidden:  { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:    { opacity: 0, x: -32, transition: { duration: 0.2, ease: 'easeIn' } },
};

export const slideInRight = {
  hidden:  { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:    { opacity: 0, x: 32, transition: { duration: 0.2, ease: 'easeIn' } },
};
```

---

### 3.8 Number Counter

Animate a numeric stat from 0 to its target value:

```tsx
// frontend/src/components/ui/AnimatedNumber.tsx
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  suffix?: string;
}

export function AnimatedNumber({ value, duration = 1.5, suffix = '' }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      animate(count, value, { duration, ease: 'easeOut' });
    }
  }, [isInView, value, count, duration]);

  return (
    <span ref={ref}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
```

---

## 4. Animation Timing Reference

| Duration | Use Case |
|---|---|
| 100ms | Instant micro-feedback (button press, checkbox toggle) |
| 150–200ms | Hover state changes, tooltip appearance |
| 250–300ms | Dropdown/popover open, badge appearance |
| 350–500ms | Section entrances, modal open/close |
| 500–800ms | Page-level transitions, hero animations |
| 1000–1500ms | Number counters, progress bar fills |

---

## 5. Usage Rules

### DO ✅

- Use `whileInView` with `viewport={{ once: true }}` for scroll-triggered section animations.
- Use `staggerContainer` + `slideUp` children for all feature and stat grids.
- Use `AnimatePresence` for any conditionally rendered element (modals, toasts, dropdowns).
- Respect `useReducedMotion` — set duration to `0` or skip animations entirely.
- Use `viewport={{ margin: '-60px' }}` to trigger animations slightly before elements enter the viewport.

### DON'T ❌

- Do not use `duration` above 600ms for UI interactions — it feels sluggish.
- Do not apply entrance animations to elements already visible on page load without a meaningful delay.
- Do not mix CSS `transition` and Framer Motion `animate` on the same property of the same element.
- Do not create infinite looping animations on persistent UI elements (they create visual noise).
- Do not animate `width` or `height` directly — animate `scaleX` / `scaleY` or use layout animations instead.
