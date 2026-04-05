# Backend - Architecture

## Tổng quan kiến trúc

Backend sử dụng kiến trúc phân lớp (Layered Architecture) kết hợp với các pattern của Laravel:

```
Request → Middleware → Controller → Service → Model/Action → Response
```

## Sơ đồ luồng xử lý

```
HTTP Request
    │
    ▼
┌─────────────────────────┐
│       Middleware         │
│  - auth:sanctum          │
│  - EnsurePermissionScope │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Form Request (Validate)│
│  - StoreUserRequest      │
│  - UpdateRoleRequest     │
│  - ...                   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│       Controller         │
│  - Authorize via Policy  │
│  - Delegate to Service   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│        Service           │
│  - Business logic        │
│  - Calls Actions/Models  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│     Model / Action       │
│  - Eloquent queries      │
│  - Database operations   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      API Resource        │
│  - Transform data        │
│  - Format JSON response  │
└─────────────────────────┘
```

## Các lớp kiến trúc

### 1. Controllers (`app/Http/Controllers/Api/`)

Controllers mỏng (thin controllers) — chỉ nhận request, delegate sang service:

```
BaseController          # Helper methods: sendResponse(), sendError()
├── AuthController      # Login, logout, me
├── UserController      # CRUD users
├── RoleController      # CRUD roles
└── UserParentChildController  # Quản lý quan hệ cha-con
```

**Nguyên tắc:**
- Không chứa business logic
- Authorize qua Policy trước khi gọi Service
- Trả về response qua `sendResponse()` / `sendError()`

### 2. Services (`app/Services/`)

Chứa toàn bộ business logic:

```
AuthService      # Xử lý login/logout/me
UserService      # CRUD users, gán role, parent-child
RoleService      # CRUD roles, sync permission slugs
```

### 3. Actions (`app/Actions/`)

Đóng gói từng operation đơn lẻ, tái sử dụng được:

```
Auth/
├── LoginAction         # Thực hiện authenticate + tạo session
└── LogoutAction        # Invalidate session

Role/
├── CreateRoleAction    # Tạo role mới
├── UpdateRoleAction    # Cập nhật role
└── DeleteRoleAction    # Xóa role (soft delete)
```

### 4. Models (`app/Models/`)

Sử dụng **Trait-Based Composition** để tách biệt concerns:

```
User
├── Traits/UserAttribute       # Accessors, mutators
├── Traits/UserMethod          # Custom methods
├── Traits/UserObserver        # Model events
├── Traits/UserRelationship    # Quan hệ Eloquent
└── Traits/UserScope           # Query scopes

Role
└── Traits/RoleRelationship    # Quan hệ với User (getPermissionSlugs(), syncPermissionSlugs() trên model)

UserParentChild                # Junction table model
```

### 5. Form Requests (`app/Http/Requests/`)

Validation tách biệt khỏi controller:

```
LoginRequest
StoreUserRequest
UpdateUserRequest
StoreRoleRequest
UpdateRoleRequest
UpdateParentChildRequest
```

### 6. Policies (`app/Policies/`)

Kiểm soát authorization ở cấp model:

```
UserPolicy
├── viewAny()   # Xem danh sách
├── create()    # Tạo mới
├── update()    # Cập nhật
└── delete()    # Xóa
```

### 7. API Resources (`app/Http/Resources/`)

Transform Eloquent models sang JSON:

```
UserResource         # Thông tin user (bao gồm role)
RoleResource         # Thông tin role + permissions (string[])
UserParentChildResource
```

### 8. Enums (`app/Enums/`)

```
Permission           # String permission slugs
RoleEnum             # Loại role (admin, user, ...)
AuthStatus           # Trạng thái xác thực
```

## Hệ thống Phân quyền (Permission System)

### Cách hoạt động

Hệ thống dùng **string slugs** — mỗi quyền là một chuỗi cố định (ví dụ `'settings.users.view'`), định nghĩa trong enum `Permission` kiểu `string`. Các slug được lưu trong bảng pivot **`role_permissions`**: mỗi dòng gắn một `role_id` với một cột `permission` (chuỗi slug).

```php
// app/Enums/Permission.php (ví dụ)
enum Permission: string
{
    case ReportOverviewView   = 'report.overview.view';
    case ReportExport         = 'report.export';
    case SettingsUsersView    = 'settings.users.view';
    case SettingsUsersCreate  = 'settings.users.create';
    case SettingsUsersUpdate  = 'settings.users.update';
    case SettingsUsersDelete  = 'settings.users.delete';
    case SettingsRolesView    = 'settings.roles.view';
    case SettingsRolesCreate  = 'settings.roles.create';
    case SettingsRolesUpdate  = 'settings.roles.update';
    case SettingsRolesDelete  = 'settings.roles.delete';
    case SettingsRolesAssign  = 'settings.roles.assign';
}
```

Mỗi **Role** có nhiều hàng trong `role_permissions`; model Role cung cấp `getPermissionSlugs()` và `syncPermissionSlugs()` để đọc/cập nhật tập slug.

### Middleware: `EnsurePermissionScope`

Kiểm tra quyền trên từng route:

```php
// routes/api.php
Route::middleware(['auth:sanctum', 'permission.scope:' . Permission::SettingsUsersView->value])
    ->get('/users', [UserController::class, 'index']);
```

Middleware nhận danh sách permission slugs (pipe-separated), kiểm tra user có ít nhất một trong số đó không.

## Cấu trúc Database

```
┌──────────┐         ┌──────────┐
│  roles   │◄────────│  users   │
│          │  role_id│          │
│ id       │         │ id       │
│ name     │         │ name     │
└────┬─────┘         │ email    │
     │               │ role_id  │
     │               │ parent_id├──┐ (self-ref)
     │               └──────────┘  │
     │                    ▲        │
     ▼                    │        ▼
┌──────────────────┐      │  ┌──────────────────────┐
│ role_permissions │      │  │   user_parent_child  │
│                  │      │  │                      │
│ role_id (FK)     │      └──│ parent_user_id       │
│ permission (str) │         │ child_user_id (uniq) │
└──────────────────┘         └──────────────────────┘

┌────────────┐       ┌──────────────┐
│ categories │◄──────│    posts     │
│            │cat_id │              │
│ id, name   │       │ id, title    │
│ site       │       │ slug, lang   │
│ parent_id  │       │ status, type │
└────────────┘       │ site         │
                     └──────────────┘
```

## Authentication Flow (Sanctum Stateful)

```
Frontend                          Backend
   │                                 │
   │  GET /sanctum/csrf-cookie        │
   │─────────────────────────────────►│
   │◄─────────────────────────────────│
   │  (nhận XSRF-TOKEN cookie)        │
   │                                 │
   │  POST /api/auth/login            │
   │  Headers: X-XSRF-TOKEN          │
   │  Body: {email, password}         │
   │─────────────────────────────────►│
   │◄─────────────────────────────────│
   │  (nhận session cookie)           │
   │                                 │
   │  GET /api/auth/me                │
   │  Cookies: session + XSRF         │
   │─────────────────────────────────►│
   │◄─────────────────────────────────│
   │  {user data + permissions: string[]}   │
```
