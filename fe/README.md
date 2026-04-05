# Frontend — big-ticollab

SPA frontend cho hệ thống **big-ticollab**, giao tiếp với backend Laravel (`be/`) thông qua Sanctum cookie auth.

## Tech stack

| Lĩnh vực | Package |
|----------|---------|
| Build | Vite 8, TypeScript 5.9 |
| UI core | React 19, React Router 7 |
| Styling | Tailwind CSS 4, shadcn/ui (radix-nova), CVA, tailwind-merge |
| UI bổ sung | Mantine 6, mantine-react-table, @tabler/icons-react |
| Charts | recharts |
| Forms | react-hook-form, zod, @hookform/resolvers |
| HTTP | axios (qua `axiosInstance` ở `@/shared/api/axios`) |
| Auth | Laravel Sanctum (CSRF cookie + `withCredentials`) |
| Global state | Zustand |
| Dates | dayjs |
| Icons | lucide-react (chính), @tabler/icons-react |

## Yêu cầu

- Node.js >= 20
- pnpm >= 9

## Cài đặt & chạy dev

```bash
# Cài dependencies
pnpm install

# Chạy dev server (Vite proxy /api → localhost:8000)
pnpm dev

# Build production
pnpm build

# Preview build
pnpm preview

# Lint
pnpm lint
```

## Biến môi trường

Tạo file `.env.local` tại thư mục `fe/`:

```env
# URL của Laravel API (mặc định dev: /api qua Vite proxy)
VITE_API_URL=

# Tiêu đề app hiển thị trên tab trình duyệt
VITE_APP_TITLE=big-ticollab

# Bật React StrictMode (mặc định: false)
VITE_STRICT_MODE=false
```

Khi `VITE_API_URL` để trống, dev dùng Vite proxy `/api → http://localhost:8000` để Sanctum session cookie hoạt động cùng origin.

## Cấu trúc thư mục

```
fe/src/
├── app/
│   ├── providers/        # ThemeProvider, AuthProvider
│   └── router/           # ProtectedRoute, RequirePermission
├── routes/
│   └── index.tsx         # createBrowserRouter, lazy routes
├── layouts/              # AuthLayout, DashboardLayout
├── features/             # Feature modules (domain-driven)
│   ├── auth/
│   │   ├── api/          # getCsrfCookie, login, logout...
│   │   ├── components/   # LoginForm, ...
│   │   ├── pages/        # LoginPage, ...
│   │   └── types/        # Payload & form types
│   ├── dashboard/
│   ├── settings/
│   └── <domain>/         # Thêm feature mới theo pattern này
├── components/
│   ├── ui/               # shadcn/Radix primitives
│   └── common/           # Header, PageTitle, ThemeToggle, loaders
├── hooks/                # Reusable hooks, Zustand stores (useAuthStore)
├── shared/
│   ├── api/              # axiosInstance
│   └── types/            # User, ApiResponse, form types dùng chung
├── constants/
│   ├── paths.ts          # PATHS, routeSegment()
│   ├── permissions.ts    # PermissionSlugs, PERMISSION_CATALOG
│   └── header.ts         # Nav items
├── config/               # apiURL, strictMode, appTitle
├── lib/
│   └── utils.ts          # cn(), tiện ích
└── assets/               # Logo, ảnh tĩnh
```

## Path aliases

| Alias | Trỏ tới |
|-------|---------|
| `@/` | `fe/src/` |
| `@components` | `fe/src/components` |
| `@hooks` | `fe/src/hooks` |
| `@lib` | `fe/src/lib` |
| `@assets` | `fe/src/assets` |

## Quy ước quan trọng

### Routing & paths

- Định nghĩa **tất cả** pathname một lần tại `@/constants/paths.ts` dưới key `PATHS`.
- Dùng `routeSegment(PATHS.xxx)` cho child routes trong `createBrowserRouter`.
- Bọc route cần xác thực với `ProtectedRoute`; bọc route cần quyền với `RequirePermission` + `PermissionSlugs`.

### Permissions (string slugs)

- Quyền được lưu trong bảng `role_permissions` (mỗi dòng = một slug string).
- `PermissionSlugs` ở `@/constants/permissions.ts` phải đồng bộ với `be/app/Enums/Permission.php`.
- Dùng `hasPermission(perms, PermissionSlugs.XxxYyy)` để kiểm tra quyền (perms là `string[]`).

### API calls

- Luôn dùng `axiosInstance` từ `@/shared/api/axios`, **không** import `axios` trực tiếp.
- Đặt tất cả API call trong `features/<domain>/api/`.

### Forms

- Pattern: `react-hook-form` + `zod` schema + `zodResolver` + shadcn `Form`/`FormField`.

### Re-render (Zustand)

- **Luôn** dùng selector khi gọi Zustand hook, ví dụ `useAuthStore((s) => s.user)`.
- Không gọi `useAuthStore()` không có argument (subscribe toàn bộ store).

## Thêm feature mới

1. Tạo thư mục `features/<domain>/` với `api/`, `components/`, `pages/`, `types/`.
2. Thêm slug quyền vào `PermissionSlugs` (đồng bộ với PHP enum).
3. Thêm pathname vào `PATHS` trong `constants/paths.ts`.
4. Đăng ký route trong `routes/index.tsx` với `RequirePermission`.
5. Thêm nav item vào `constants/header.ts` nếu cần.

## Quan hệ với backend

Backend Laravel nằm ở `../be/`. Xem `be/README.md` để setup API server.
