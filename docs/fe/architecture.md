# Frontend - Architecture

## Tổng quan kiến trúc

Frontend sử dụng **Feature-Driven Architecture** — code được tổ chức theo domain/tính năng thay vì theo loại file.

## Sơ đồ kiến trúc

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│              React Router                        │
│  createBrowserRouter (lazy-loaded routes)        │
└───────────────────┬─────────────────────────────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
┌──────────────────┐  ┌──────────────────┐
│  ProtectedRoute  │  │  Public Routes   │
│  (check auth)    │  │  (login, etc.)   │
└────────┬─────────┘  └──────────────────┘
         │
         ▼
┌──────────────────┐
│ RequirePermission│
│ (check permission slug) │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│                  Layout                       │
│  (DashboardLayout / AuthLayout)              │
└────────────────────┬─────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│                  Page                         │
│  (features/*/pages/)                         │
└────────────────────┬─────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
┌─────────────┐ ┌─────────┐ ┌─────────────┐
│  Components │ │  Hooks  │ │  API Layer  │
│(features/   │ │(Zustand │ │(features/   │
│*/components)│ │ stores) │ │*/api/)      │
└─────────────┘ └─────────┘ └──────┬──────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  axiosInstance  │
                          │  (shared/)      │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   Laravel API   │
                          │   (backend)     │
                          └─────────────────┘
```

## Feature Module Structure

Mỗi feature có cấu trúc nhất quán:

```
features/
└── <feature-name>/
    ├── api/
    │   └── index.ts       # Tất cả API calls của feature này
    ├── components/        # UI components chỉ dùng trong feature
    ├── pages/             # Page components (route targets)
    └── types/
        └── index.ts       # TypeScript types/interfaces
```

**Ví dụ: feature users**
```
features/users/
├── api/
│   └── index.ts           # getUsers(), createUser(), updateUser(), deleteUser()
├── components/
│   ├── UserTable.tsx
│   ├── UserForm.tsx
│   └── ParentChildForm.tsx
├── pages/
│   ├── UsersPage.tsx
│   └── ParentChildPage.tsx
└── types/
    └── index.ts           # User, UserCreatePayload, UserUpdatePayload
```

## Routing

Tất cả routes được định nghĩa trong `routes/index.tsx` với **lazy loading**:

```typescript
// routes/index.tsx
const router = createBrowserRouter([
  {
    path: paths.LOGIN,
    element: <AuthLayout />,
    children: [
      { index: true, element: <LoginPage /> }
    ]
  },
  {
    path: paths.DASHBOARD,
    element: (
      <ProtectedRoute>        // Kiểm tra đăng nhập
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: lazy(() => import('../features/dashboard/...')) },
      {
        path: paths.USERS,
        element: (
          <RequirePermission slug={PermissionSlugs.SettingsUsersView}>
            {lazy(() => import('../features/users/pages/UsersPage'))}
          </RequirePermission>
        )
      }
    ]
  }
])
```

**Route paths** được tập trung trong `constants/paths.ts`:
```typescript
export const paths = {
  LOGIN: '/login',
  DASHBOARD: '/',
  USERS: '/settings/users',
  ROLES: '/settings/roles',
  PARENT_CHILD: '/settings/parent-child',
}
```

## State Management (Zustand)

Global state qua Zustand stores, sử dụng selector pattern:

```typescript
// hooks/useAuthStore.ts
interface AuthStore {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
}

const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}))

// Sử dụng với selector để tránh re-render không cần thiết
const user = useAuthStore((s) => s.user)
const setUser = useAuthStore((s) => s.setUser)
```

## API Layer

Tất cả HTTP calls đi qua `axiosInstance` trong `shared/`:

```typescript
// shared/axiosInstance.ts
const axiosInstance = axios.create({
  baseURL: config.apiURL,
  withCredentials: true,    // Gửi cookies (Sanctum session)
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
})

// Interceptor: xử lý 401 → dispatch unauthorized event
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('unauthorized'))
    }
    return Promise.reject(error)
  }
)
```

Mỗi feature có API file riêng:

```typescript
// features/users/api/index.ts
export const getUsers = () =>
  axiosInstance.get<ApiResponse<User[]>>('/users')

export const createUser = (data: UserCreatePayload) =>
  axiosInstance.post<ApiResponse<User>>('/users', data)

export const updateUser = (id: number, data: UserUpdatePayload) =>
  axiosInstance.put<ApiResponse<User>>(`/users/${id}`, data)

export const deleteUser = (id: number) =>
  axiosInstance.delete(`/users/${id}`)
```

## Permission System (Frontend)

Frontend đồng bộ hoàn toàn với backend PHP enum (string slug). Quyền của role lưu ở pivot `role_permissions` (mỗi dòng một slug). API trả `permissions: string[]` trên user (không còn `permission_mask`).

```typescript
// constants/permissions.ts
export const PermissionSlugs = {
  ReportOverviewView:  'report.overview.view',
  ReportExport:        'report.export',
  SettingsUsersView:   'settings.users.view',
  SettingsUsersCreate: 'settings.users.create',
  SettingsUsersUpdate: 'settings.users.update',
  SettingsUsersDelete: 'settings.users.delete',
  SettingsRolesView:   'settings.roles.view',
  SettingsRolesCreate: 'settings.roles.create',
  SettingsRolesUpdate: 'settings.roles.update',
  SettingsRolesDelete: 'settings.roles.delete',
  SettingsRolesAssign: 'settings.roles.assign',
} as const

// Kiểm tra quyền (có thể có shortcut “full access” trong implementation thực tế)
export function hasPermission(
  perms: string[] | null | undefined,
  slug: string,
): boolean {
  if (!perms?.length) return false
  return perms.includes(slug)
}
```

**RequirePermission component:**
```tsx
// app/router/RequirePermission.tsx
function RequirePermission({ slug, children }) {
  const user = useAuthStore((s) => s.user)
  const perms = user?.permissions

  if (!hasPermission(perms, slug)) {
    return <Navigate to={paths.DASHBOARD} />
  }

  return children
}
```

## Layouts

```
layouts/
├── AuthLayout.tsx       # Layout cho trang đăng nhập (centered, minimal)
└── DashboardLayout.tsx  # Layout cho sau đăng nhập (sidebar + header + content)
```

## Protected Routes

Hai cấp bảo vệ:

1. **ProtectedRoute** — Kiểm tra user đã đăng nhập chưa
   - Nếu chưa: redirect về `/login`
   - Nếu rồi: render children

2. **RequirePermission** — Kiểm tra user có permission slug không
   - Nhận prop `slug`: permission slug cần kiểm tra
   - Nếu không có quyền: redirect về dashboard
   - Nếu có: render children

## Providers

```
app/providers/
├── ThemeProvider.tsx    # Dark/light mode (shadcn/ui)
└── AppProvider.tsx      # Tích hợp tất cả providers + global event listeners
                         # (lắng nghe 'unauthorized' event → logout)
```
