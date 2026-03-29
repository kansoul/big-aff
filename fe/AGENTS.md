# Frontend agent notes (`fe/`)

Use this file with **Cursor** / **Claude** when working in the Vite + React app. Detailed conventions live in skills; this is the activation checklist.

## Skills (read in order for structure and stack)

1. **`fe-project-conventions`** — **`/.agents/skills/fe-project-conventions/SKILL.md`** (canonical; mirrored at **`.claude/skills/fe-project-conventions/SKILL.md`**).  
   Covers **`features/<domain>/pages`**, **`features/<domain>/components`**, routing, API client, permissions (bitmask / `PermissionScope`), aliases, and **Re-render optimization** (Zustand selectors, `memo`, `useCallback`, `useMemo`).

2. **`shadcn-tailwind`** — **`/.agents/skills/shadcn-tailwind/SKILL.md`**.

3. **`vercel-react-best-practices`** — **`/.agents/skills/vercel-react-best-practices/SKILL.md`** (adapt for Vite SPA; skip Next/RSC-only rules). Use **`rerender-*`** rules with **`fe-project-conventions`** “Re-render optimization”.

4. **`vercel-composition-patterns`** — **`/.agents/skills/vercel-composition-patterns/SKILL.md`**.

5. **`web-design-guidelines`** — **`/.agents/skills/web-design-guidelines/SKILL.md`** when auditing UI / a11y.

## Cursor rule

- **`/.cursor/rules/fe-react-vercel-skills.mdc`** — glob `fe/**`; summarizes the same skill order and Vietnamese notes for this repo.

## Feature layout (summary)

- **`src/features/<domain>/pages/`** — route screens; keep thin (data fetching, permissions, handlers calling **`features/<domain>/api`**).
- **`src/features/<domain>/types/`** — exported types, API payloads, shared Zod schemas / form value types; optional **`index.ts`** barrel (`@/features/<domain>/types`).
- **`src/features/<domain>/components/`** — dialogs, sections, feature tables, and feature-only helpers; optional **`index.ts`** barrel (`@/features/<domain>/components`).
- **`src/components/ui/`** — shadcn primitives; **`src/components/common/`** — app-wide composite UI (header, loaders, etc.).

## Verification

- After substantive edits: **`pnpm lint`** (from `fe/`).
