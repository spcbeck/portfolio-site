---
name: spa-component-architect
description: Use when designing, decomposing, refactoring, or building Single Page Application (SPA) components and UI layouts in React, Vue, Lit, or modern web frameworks.
---

# SPA Component Architect

## Overview
Architect modular, high-performance, and maintainable frontend component trees for Single Page Applications (SPAs). This skill provides systematic patterns for component decomposition, state boundaries, accessibility, and strict adherence to modernist design principles.

---

## 1. Bauhaus Modernist Visual Architecture
When designing components, layouts, and design tokens, enforce the following core principles:

### Form Follows Function & Radical Utility
* Eliminate decorative fluff, extraneous wrapper containers, and non-functional visual noise.
* Every button, badge, border, and divider must serve an explicit communicative or ergonomic purpose.

### Geometric Purity & Modular Grid Structure
* Structure layouts on disciplined, visible modular grids.
* Use crisp, solid bounding borders (`1px` or `2px solid #000000` / `#E5E7EB`).
* Rely on primary geometric shapes (rectangles, squares, perpendicular division rules).

### High-Contrast Color Blocking & Palette
* **Foundation**: Stark contrast neutrals: Pure Black (`#000000`), Crisp White (`#FFFFFF`), concrete/slate grays (`#1F2937`, `#F3F4F6`).
* **Accents**: Unmixed primary color punches:
  * Pure Red (`#EF4444` / `#DC2626`) for critical actions, errors, and urgent status.
  * Pure Yellow (`#F59E0B` / `#FBBF24`) for warnings, attention anchors, and highlights.
  * Pure Blue (`#2563EB` / `#1D4ED8`) for active selection, links, and primary execution.
* **Color Blocking**: Use solid color fields to demarcate sections and hierarchy. Never use blurry gradients, skeuomorphic shadows, or glassmorphism.

### Typography as Architecture
* Use clean geometric sans-serif typefaces (`Inter`, `Futura`, `DIN`, system sans).
* Employ dramatic scale contrast: oversize bold numeric metrics paired with compact, all-caps or high-legibility metadata labels.

---

## 2. Component Decomposition Rules

```
┌────────────────────────────────────────────────────────┐
│ Container / Controller Component (Smart)               │
│ - Handles data fetching, mutation hooks, routing state │
│ - Derives view models and error states                 │
└───────────────────────────┬────────────────────────────┘
                            │ (Typed Props & Handlers)
┌───────────────────────────▼────────────────────────────┐
│ Layout / Frame Component (Structural Grid)             │
│ - Manages CSS Grid / Flexbox bounding boxes            │
└───────────────────────────┬────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
┌───────▼────────────────────────┐      ┌───────▼────────────────────────┐
│ Compound Presentational Part A │      │ Compound Presentational Part B │
│ - Pure, zero side-effects      │      │ - Pure, zero side-effects      │
│ - Accepts explicit variants    │      │ - Accessible ARIA bindings     │
└────────────────────────────────┘      └────────────────────────────────┘
```

### The 4-Tier Hierarchy
1. **Atoms / Primitives**: Single-element building blocks (`Button`, `Badge`, `Input`, `Box`). Zero business logic.
2. **Compound Components**: Tightly-coupled cooperating elements sharing implicit context (e.g., `Tabs`, `Tabs.List`, `Tabs.Trigger`, `Tabs.Panel`).
3. **Molecules / Presentational Cards**: Domain-aware but stateless UI units. They accept strict typed data models and emit events via callbacks.
4. **Screens / Containers**: Route-level orchestrators that fetch data, coordinate side-effects, manage dialog open states, and pass clean props downward.

---

## 3. Core Component Patterns

### Pattern A: Compound Components with Context
Avoid huge prop surfaces with multiple callback parameters. Use compound components to allow flexible layout composition.

```tsx
// MetricCard.tsx - Example Compound Component
import React, { createContext, useContext, ReactNode } from 'react';

type Variant = 'default' | 'primary' | 'alert';

interface MetricContextValue {
  variant: Variant;
}

const MetricContext = createContext<MetricContextValue | null>(null);

function useMetricContext() {
  const context = useContext(MetricContext);
  if (!context) {
    throw new Error('MetricCard compound parts must be rendered within a MetricCard root');
  }
  return context;
}

export interface MetricCardProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

export function MetricCard({ variant = 'default', children, className = '' }: MetricCardProps) {
  const variantStyles = {
    default: 'border-black bg-white text-black',
    primary: 'border-blue-600 bg-white text-black',
    alert: 'border-red-600 bg-white text-black',
  }[variant];

  return (
    <MetricContext.Provider value={{ variant }}>
      <div className={`border-2 p-4 font-sans ${variantStyles} ${className}`}>
        {children}
      </div>
    </MetricContext.Provider>
  );
}

MetricCard.Label = function MetricCardLabel({ children }: { children: ReactNode }) {
  return (
    <span className="block text-xs font-bold uppercase tracking-wider text-gray-600">
      {children}
    </span>
  );
};

MetricCard.Value = function MetricCardValue({ children }: { children: ReactNode }) {
  const { variant } = useMetricContext();
  const accentColor = {
    default: 'text-black',
    primary: 'text-blue-600',
    alert: 'text-red-600',
  }[variant];

  return (
    <div className={`mt-1 text-4xl font-extrabold tracking-tight ${accentColor}`}>
      {children}
    </div>
  );
};

MetricCard.Footer = function MetricCardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 border-t border-gray-200 pt-2 text-xs text-gray-500">
      {children}
    </div>
  );
};
```

### Pattern B: Explicit Union Variants Over Boolean Proliferation
Never do: `<Button isPrimary isSmall isOutline isDanger isDisabled />`.
Always use discrete, mutually exclusive union variants:

```tsx
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'solid-primary' | 'solid-accent' | 'outline-black' | 'ghost';
  size: 'compact' | 'standard' | 'prominent';
}
```

---

## 4. State Colocation & Lifecycle Rules
1. **Keep state as close to leaves as possible**: Do not elevate state to parent containers unless two sibling components legitimately require synchronized updates.
2. **Server State vs. UI State**:
   * Use dedicated cache/query managers (`TanStack Query`, `SWR`, or framework loaders) for network data.
   * Use lightweight local state (`useState`, signals, refs) for ephemeral UI states (modal open/closed, hovering, dropdown selection).
3. **Avoid Derived State in State**: Compute derived values synchronously during render or via `useMemo` rather than maintaining duplicate state variables updated in `useEffect`.

---

## 5. Accessibility & Semantic Standards
* **Landmarks**: Always wrap sections in semantic tags (`<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`, `<section>`).
* **Focus Management**:
  * Modals and slide-over drawers **must** trap focus and return focus to the trigger on close.
  * Esc key must dismiss overlays.
* **Tap Targets**: All interactive elements must measure at least `44x44px` on touch screens.
* **Contrast**: Text contrast must exceed WCAG AA (`4.5:1` for body, `3:1` for bold headers). The high-contrast Bauhaus palette naturally satisfies this when pure black/white and dark tones are used.

---

## 6. Anti-Patterns to Avoid
* ❌ **God Components (> 300 lines)**: Mixing network requests, business transformations, and 200 lines of JSX.
* ❌ **Prop Drilling (> 2 levels)**: Passing callbacks or values through components that don't use them. Solve with slots/composition or context.
* ❌ **Gratuitous Skeuomorphism & Gradients**: Using blurred drop-shadows or translucent frosted glass in violation of Bauhaus flat geometric clarity.
* ❌ **Non-Semantic `div` Soup**: Using `<div onClick={...}>` instead of `<button>` with proper keyboard handling.
