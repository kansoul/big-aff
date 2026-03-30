---
name: fe-project-conventions
description: >-
  Big-ticollab frontend (`fe/`) conventions: folder layout, feature modules, routing,
  API client (Laravel Sanctum + axios), auth and permissions, path aliases, and stack
  (Vite 8, React 19, React Router 7, Tailwind 4, shadcn/ui, Mantine 6, Zustand, RHF + Zod).
  Use for any task under `fe/` when deciding where files go, how to name them, or which
  library to use. Pair with `shadcn-tailwind`, `vercel-react-best-practices`, and
  `vercel-composition-patterns`. Includes re-render optimization (Zustand selectors, memo,
  useCallback, useMemo) for new features.
---

# Frontend project conventions (`fe/`)

**Read this skill first** when adding or moving files under `fe/`, wiring routes, or calling the API. It encodes this repo’s structure; do not invent parallel layouts (for example a second `components` root or a different API client) without aligning with existing code.

## Monorepo context

- **`fe/`** — SPA built with **Vite**; talks to **`be/`** (Laravel API, Sanctum cookie auth).
- Keep domain logic and API calls inside **`features/<domain>/`**; keep cross-cutting UI primitives under **`src/components/`** ( **`ui/`**, **`common/`** ).
- Put **feature-only** composed UI and co-located helpers under **`features/<domain>/components/`** (see below)—do not duplicate that tree at another repo root.

## Directory layout (where to put files)

| Location | Purpose |
|----------|---------|
| `fe/src/app/` | App shell: **`providers/`** (Theme, Auth), **`router/`** (`ProtectedRoute`, `RequirePermission`). |
| `fe/src/routes/` | **`index.tsx`** — `createBrowserRouter`, lazy route components, navigation metadata (`handle.title`). |
| `fe/src/layouts/` | Route layouts (**`AuthLayout`**, **`DashboardLayout`**). |
| `fe/src/features/<domain>/` | Feature modules: **`pages/`**, **`components/`** (see **Feature-scoped components**), **`api/`**, **`types/`** (see **Feature types**). Examples: `features/auth`, `features/dashboard`, `features/settings`. |
| `fe/src/components/ui/` | shadcn/Radix primitives only (from CLI or matching existing patterns). |
| `fe/src/components/common/` | Shared composite UI (header, page title, theme toggle, loaders). |
| `fe/src/hooks/` | Reusable hooks and **Zustand** stores (e.g. `useAuthStore.ts`). |
| `fe/src/shared/` | Cross-feature **`api/`** (`axios` instance), **`types/`** (`User`, `ApiResponse`, forms). |
| `fe/src/lib/` | Utilities (**`utils.ts`** — `cn`, etc.). |
| `fe/src/constants/` | App-wide constants (`paths.ts` — **`PATHS`**, **`routeSegment`**; `permissions.ts`; `header.ts` / nav). |
| `fe/src/config/` | Env-driven config (`apiURL`, `strictMode`). |
| `fe/src/assets/` | Static assets (logos, images). |

**Do not** place feature-specific pages at `src/pages/` unless the project already uses that pattern (it does not). **Do not** add API calls inline in layouts without following the `features/*/api` pattern.

### Feature types (`features/<domain>/types/`)

Put **exported TypeScript types and interfaces** for that feature here (not inline in `api/` or `components/` unless trivial / file-private):

| Put here | Examples |
|----------|----------|
| API request/response payloads used by **`features/<domain>/api`** | `RoleCreatePayload`, `RoleUpdatePayload` |
| Form value types, Zod schemas whose inferred type is shared across pages/components | `roleNameSchema`, `RoleNameFormValues` |
| Domain models not already in **`shared/types`** | Feature-specific DTOs |

Use **`types/index.ts`** as a barrel when it helps (`@/features/<domain>/types`). **Props** types for a single component can stay private in that `.tsx` file.

### Feature-scoped components (`features/<domain>/components/`)

Use this folder for **UI and small modules that belong to a single feature** and are not meant to be reused across domains:

| Put here | Put elsewhere |
|----------|----------------|
| Dialogs, wizard steps, feature tables/cards, permission trees tied to one screen | **`components/ui/`** — shadcn/Radix primitives |
| `formatXxxError`, mask/bit helpers used only by that feature’s pages | **`components/common/`** — shell/header/loaders shared app-wide |
| Optional **`index.ts`** barrel — import as `@/features/<domain>/components` | **`shared/`** — axios, cross-feature types |

Exported **types** and shared **Zod** schemas belong in **`features/<domain>/types/`** (see **Feature types**), not under `components/`.

- **`pages/*Page.tsx`** should stay **thin**: permissions, loading state, handlers that call **`features/<domain>/api`**, and composition of feature components.
- When a piece of UI is clearly **reused by multiple features**, move it to **`components/common/`** (or a small shared module) instead of copying under another `features/*/components/`.

## Path aliases (imports)

Configured in **`fe/vite.config.ts`** (and partially in **`fe/tsconfig.json`** / **`tsconfig.app.json`**):

| Alias | Resolves to | Prefer when |
|-------|-------------|-------------|
| `@/` | `fe/src/` | Default for most imports (`@/components/...`, `@/features/...`). |
| `@components` | `fe/src/components` | Optional; `@/components` is equivalent via `@/`. |
| `@hooks` | `fe/src/hooks` | Optional. |
| `@utils` | `fe/src/utils` | If present; many utilities live under `@/lib` instead. |
| `@lib` | `fe/src/lib` | Vite only — prefer `@/lib/...` for consistency with `components.json`. |
| `@assets` | `fe/src/assets` | Vite — images, favicons. |

shadcn **`components.json`** aliases: `@/components`, `@/components/ui`, `@/lib/utils`, `@/hooks`. Use **`@/lib/utils`** and **`cn()`** for class merging.

## Stack (packages you should align with)

| Area | Packages |
|------|----------|
| Build | **Vite 8**, **TypeScript 5.9**, `@tailwindcss/vite`, **Tailwind 4** |
| UI core | **React 19**, **react-router-dom 7** (`createBrowserRouter`, `RouterProvider`) |
| Styling & primitives | **shadcn** (radix-nova), **Radix** slots/primitives, **CVA**, **tailwind-merge**, **clsx**, **lucide-react** (primary icons) |
| Optional UI | **@mantine/core**, **@mantine/hooks**, **@mantine/dates**, **mantine-react-table**, **@tabler/icons-react** — use when an existing screen already does, or for data tables / date UX that matches Mantine; otherwise prefer shadcn + existing patterns |
| Charts | **recharts** |
| Forms | **react-hook-form**, **zod**, **@hookform/resolvers** |
| HTTP | **axios** via **`@/shared/api/axios`** (`axiosInstance`), **`@/config`** `apiURL` |
| Auth | Laravel **Sanctum** (CSRF cookie + `withCredentials`); global auth state in **`useAuthStore`** (Zustand) |
| Dates | **dayjs** (or project’s existing choice) |
| Global client state | **zustand** |

## Routing

- **Path strings:** define every user-facing pathname once in **`fe/src/constants/paths.ts`** as **`PATHS`** (values with a leading `/`, e.g. `PATHS.dashboard`). Use **`PATHS`** for `<Link to>`, `navigate()`, `<Navigate to>`, and **`href`** in **`@/constants/header.ts`**. Do **not** scatter duplicate string literals like `'/settings/users'`.
- **`routeSegment()`** — for **`createBrowserRouter`** child routes under a parent with **`path: '/'`**, pass **`path: routeSegment(PATHS.somePage)`** so segments stay derived from the same **`PATHS`** entry (supports nested segments such as `settings/users`).
- Define routes in **`fe/src/routes/index.tsx`**.
- Use **`lazy()`** for page and layout components; export named components from feature pages (e.g. `export function DashboardPage`) and map with `{ default: m.DashboardPage }` when needed.
- Wrap authenticated areas with **`ProtectedRoute`**; wrap permission-gated UI with **`RequirePermission`** and **`PermissionBits`** / **`@/constants/permissions`**.
- Add nav items and titles in **`@/constants/header.ts`** (and keep permission fields consistent with the backend).

## Permissions (bitmask on roles; keep FE/ BE in sync)

There is **no** `permissions` table or dynamic permission CRUD. Access comes from the user’s **role** (`roles.permission_mask`) and a shared definition in code:

| Location | Role |
|----------|------|
| **`be/app/Enums/Permission.php`** | One `enum` case = one bit (`1 << n`). Routes use `Permission::SomeCase->value` in `permission.scope:` (pipe `|` for OR); policies use `hasPermissionFlag(Permission::...)`. Middleware accepts **numeric bits only**; full access is an all-bits-set `permission_mask`, not a `*` wildcard in the route string. |
| **`fe/src/constants/permissions.ts`** | **`PermissionBits`** (same integers as PHP), **`PERMISSION_CATALOG`** (cluster → screen → rows for the role editor UI). |

The logged-in user receives **`permission_mask`** from the API—see **`fe/src/shared/types`** (`User`). Use **`hasPermission(mask, PermissionBits.SomeCase)`** (or **`maskHasPermission`**) for checks.

### Checklist: new page / screen / API

1. **Backend first** — add the new `Permission` case; protect routes with `->middleware('permission.scope:'.Permission::YourCase->value)` (pipe `|` for alternatives). Use `hasPermissionFlag(Permission::...)` in Form requests or policies. See **`be/routes/api.php`** and **`EnsurePermissionScope`**.
2. **Frontend constants** — add the same bit to **`PermissionBits`**, add an entry under the right cluster/screen in **`PERMISSION_CATALOG`**.
3. **Paths** — add the pathname to **`PATHS`** in **`fe/src/constants/paths.ts`**; wire **`fe/src/routes/index.tsx`** with **`routeSegment(PATHS....)`** and use **`PATHS`** in redirects / links / nav **`href`**.
4. **Route** — in **`fe/src/routes/index.tsx`**, wrap the page with **`RequirePermission`** using the matching **`PermissionBits`** value (e.g. `PermissionBits.SettingsRolesView`).
5. **Nav** — if the page is linked from the header, set **`requiredPermission`** on the item in **`fe/src/constants/header.ts`** to that bit (use **`PATHS`** for **`href`**).

**Do not** introduce permission bits that are not on the PHP enum, or values that disagree between TS and PHP.

## API & errors

- Use **`axiosInstance`** from **`@/shared/api/axios`** — never a raw `axios` import for app API calls.
- Base URL: **`import { apiURL } from '@/config'`**; Sanctum CSRF flow follows patterns in **`features/auth/api`** (e.g. `getCsrfCookie` against `/sanctum/csrf-cookie`).
- Listen for **`unauthorized`** events from the interceptor if the app relies on them (session expiry).

## Forms

- Pattern: **react-hook-form** + **zod** schema + **zodResolver**; use shadcn **`Form`** / **`FormField`** components under **`@/components/ui/form`** (see **`LoginPage`**).

## UI implementation order

1. Reuse **`@/components/ui/*`** and **`@/components/common/*`**.
2. Compose with Tailwind semantic tokens from **`index.css`** (`bg-background`, `text-foreground`, `border-border`, etc.).
3. Add new shadcn blocks with **`cd fe && npx shadcn@latest add <component>`** (see **`shadcn-tailwind`** skill).
4. Introduce Mantine/MRT only when it matches existing feature patterns or clear UX need for tables/dates.

## Re-render optimization (React + Zustand)

Apply these patterns when implementing **new pages, layouts, and global state** so unrelated updates do not repaint large subtrees. Full rule list: **`vercel-react-best-practices`** (`rerender-*`); this section is the repo’s required minimum.

### Zustand: always use selectors

- **Never** call `useAuthStore()` (or any Zustand hook) with **no argument**. That subscribes to the **entire** store; **any** field change re-renders every subscriber.
- **Do** pass a selector that returns only what the component needs, e.g. `useAuthStore((s) => s.user)`, `useAuthStore((s) => s.isAuthenticated)`, `useAuthStore((s) => s.setUser)`.
- Action creators from the store (`setUser`, `logout`, `setLoading`, …) are **stable** references; selecting **only** actions in a provider avoids re-renders when `user` or `isLoading` changes.

### `React.memo` for shell and heavy presentational UI

- Prefer **`memo`** for: route layouts (e.g. `DashboardLayout`), app chrome (`Header`, `ScreenTitle`, `ThemeToggle`), and feature **tables/cards** that receive many props from a stateful parent page.
- Memo only helps when **props** stay shallow-equal; combine with stable callbacks (see below).

### `useCallback` and `useMemo`

- **`useCallback`**: event handlers passed to **`memo`** children, dialog `onOpenChange`, and list/table actions so prop identity does not change every parent render unless dependencies change.
- **`useMemo`**: derived permission flags from `user?.permissions` (or `scopes`), filtered lists, or non-trivial derived values—keep dependency arrays minimal and correct (e.g. depend on `scopes` / `user?.permissions`).

### Avoid

- **Do not** define new component types **inside** another component’s render (inline `function` / `const` child components); extract to module scope or a named `memo` subcomponent.
- **Do not** add `memo` / `useMemo` everywhere by default—use them on **hot paths** (global nav, large lists, dialogs fed by busy parents). Prefer fixing **Zustand** subscriptions first.

## Code style (tooling)

- **ESLint** + Prettier: no semicolons, single quotes, `printWidth` 100 — match **`fe/eslint.config.js`**.
- Run **`pnpm lint`** from `fe/` after substantive edits.

## Relation to other skills

- **`.agents/skills/shadcn-tailwind/SKILL.md`** — Tailwind v4, shadcn CLI, `cn()`, dark mode.
- **`.agents/skills/vercel-react-best-practices/SKILL.md`** — performance (including **`rerender-*`** rules); **skip or adapt** Next.js/RSC-only rules (this app is Vite SPA). Use together with **Re-render optimization** above.
- **`.agents/skills/vercel-composition-patterns/SKILL.md`** — component APIs and composition.
- **`.agents/skills/web-design-guidelines/SKILL.md`** — accessibility / UX audits when relevant.
