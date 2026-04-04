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
│ (check bit mask) │
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
          <RequirePermission bit={PermissionBits.SettingsUsersView}>
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

Frontend đồng bộ hoàn toàn với backend PHP enum:

```typescript
// constants/permissions.ts
export const PermissionBits = {
  ReportOverviewView:  1 << 0,   // 1
  ReportExport:        1 << 1,   // 2
  SettingsUsersView:   1 << 2,   // 4
  SettingsUsersCreate: 1 << 3,   // 8
  SettingsUsersUpdate: 1 << 4,   // 16
  SettingsUsersDelete: 1 << 5,   // 32
  SettingsRolesView:   1 << 6,   // 64
  SettingsRolesCreate: 1 << 7,   // 128
  SettingsRolesUpdate: 1 << 8,   // 256
  SettingsRolesDelete: 1 << 9,   // 512
  SettingsRolesAssign: 1 << 10,  // 1024
} as const

// Kiểm tra quyền
export const hasPermission = (mask: number, bit: number): boolean =>
  (mask & bit) !== 0
```

**RequirePermission component:**
```tsx
// app/router/RequirePermission.tsx
function RequirePermission({ bit, children }) {
  const user = useAuthStore((s) => s.user)
  const mask = user?.role?.permission_mask ?? 0
  
  if (!hasPermission(mask, bit)) {
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

2. **RequirePermission** — Kiểm tra user có permission bit không
   - Nhận prop `bit`: permission bit cần kiểm tra
   - Nếu không có quyền: redirect về dashboard
   - Nếu có: render children

## Providers

```
app/providers/
├── ThemeProvider.tsx    # Dark/light mode (shadcn/ui)
└── AppProvider.tsx      # Tích hợp tất cả providers + global event listeners
                         # (lắng nghe 'unauthorized' event → logout)
```
