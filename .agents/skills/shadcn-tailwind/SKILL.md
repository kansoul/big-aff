---
name: shadcn-tailwind
description: >-
  Builds and extends UIs with shadcn/ui, Tailwind CSS, CVA, and Lucide in this
  repo’s frontend. Use when adding or changing components under fe/, styling with
  Tailwind, running the shadcn CLI, theming with CSS variables, or integrating
  Radix-based primitives. Pair with fe-project-conventions (structure and aliases),
  vercel-react-best-practices, and web-design-guidelines for performance and UI audits.
---

# shadcn/ui + Tailwind (frontend)

Guidance for the **`fe/`** app: **Vite**, **React 19**, **Tailwind CSS v4** (`@tailwindcss/vite`), **shadcn** (registry style `radix-nova`, **`rsc`: false**).

**Structure, feature folders, routing, and full stack list:** read **`.agents/skills/fe-project-conventions/SKILL.md`** first so new UI sits in the right place and uses the same imports as the rest of the app.

## Project facts (do not contradict)

- Config: `fe/components.json` — aliases: `@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`, `@/hooks`.
- Vite (`fe/vite.config.ts`) also defines `@lib` → `src/lib`, `@assets` → `src/assets` (alongside `@` → `fe/src`). Prefer `@/lib/...` for consistency with shadcn unless a file already uses `@lib`.
- Vite resolves `@` → `fe/src` (`fe/vite.config.ts`).
- Global styles: `fe/src/index.css` imports `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`, and defines theme tokens (`--background`, `--primary`, …). Prefer **semantic classes** (`bg-background`, `text-foreground`, `border-border`, `bg-primary`, …) over raw hex in components.
- Primitives live under **`fe/src/components/ui/`** (e.g. `button.tsx`). Use **`cn()`** from `@/lib/utils` to merge class names.
- Icons: **lucide-react** per `components.json`.

## Adding or updating UI

1. **Prefer existing shadcn primitives** — compose `Button`, `Input`, `Dialog`, etc., instead of one-off unstyled controls unless the design clearly requires it.
2. **New blocks from the registry** — from `fe/`, use the shadcn CLI so files and deps match the project (paths and Tailwind v4 setup stay consistent):

   ```bash
   cd fe && npx shadcn@latest add <component>
   ```

3. **Variants** — use **CVA** (`class-variance-authority`) the same way existing `ui/*` components do; keep variant APIs small and explicit (aligns with **vercel-composition-patterns**: avoid boolean-prop sprawl; use composition or explicit variants).
4. **Tailwind** — use utility classes and design tokens; avoid inline styles except for dynamic values that cannot be expressed as classes/CVAs.
5. **Imports** — use path aliases (`@/components/ui/...`, `@/lib/utils`). Avoid barrel imports that pull huge entrypoints when the Vercel **bundle-barrel-imports** rule applies (e.g. prefer targeted icon imports if the toolchain does not rewrite them).
6. **Dark mode** — project uses `@custom-variant dark (&:is(.dark *));` in `index.css`; respect the existing pattern when adding themed styles.
7. **Accessibility & UX** — Radix-based components should keep labels, focus rings, and keyboard behavior; for broad UI reviews, follow **`.agents/skills/web-design-guidelines/SKILL.md`**.

## What not to do

- Do not assume **Next.js** or **RSC** (`rsc` is false); no `next/image` or App Router-only patterns unless the stack changes.
- Do not bypass `components.json` paths by inventing alternate folder layouts without updating aliases and docs.
- Do not strip `focus-visible` / `aria-*` / `disabled` styling patterns from shadcn defaults without a deliberate design decision.

## Coordination with other repo skills

- **`.agents/skills/vercel-react-best-practices`** — performance, rerenders, bundles.
- **`.agents/skills/vercel-composition-patterns`** — component APIs and composition.
- **`.agents/skills/web-design-guidelines`** — interface and accessibility audits.
