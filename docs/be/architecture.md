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
RoleService      # CRUD roles, cập nhật permission mask
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
├── Traits/BitwiseMethod       # Bitwise permission helpers
└── Traits/RoleRelationship    # Quan hệ với User

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
RoleResource         # Thông tin role + permission_mask
UserParentChildResource
```

### 8. Enums (`app/Enums/`)

```
Permission           # Bitwise permission flags
RoleEnum             # Loại role (admin, user, ...)
AuthStatus           # Trạng thái xác thực
```

## Hệ thống Phân quyền (Permission System)

### Cách hoạt động

Hệ thống sử dụng **bitwise bitmask** — mỗi quyền là một bit trong một số nguyên:

```php
// app/Enums/Permission.php
enum Permission: int
{
    case ReportOverviewView   = 1 << 0;   // 1
    case ReportExport         = 1 << 1;   // 2
    case SettingsUsersView    = 1 << 2;   // 4
    case SettingsUsersCreate  = 1 << 3;   // 8
    case SettingsUsersUpdate  = 1 << 4;   // 16
    case SettingsUsersDelete  = 1 << 5;   // 32
    case SettingsRolesView    = 1 << 6;   // 64
    case SettingsRolesCreate  = 1 << 7;   // 128
    case SettingsRolesUpdate  = 1 << 8;   // 256
    case SettingsRolesDelete  = 1 << 9;   // 512
    case SettingsRolesAssign  = 1 << 10;  // 1024
}
```

Mỗi Role lưu `permission_mask` là tổng các bit quyền được cấp:
```
permission_mask = 4 + 8 + 16 = 28  →  có quyền View, Create, Update Users
```

### Middleware: `EnsurePermissionScope`

Kiểm tra quyền trên từng route:

```php
// routes/api.php
Route::middleware(['auth:sanctum', 'permission.scope:' . Permission::SettingsUsersView->value])
    ->get('/users', [UserController::class, 'index']);
```

Middleware nhận danh sách permission bits (pipe-separated), kiểm tra user có ít nhất một trong số đó không.

## Cấu trúc Database

```
┌──────────┐         ┌──────────┐
│  roles   │◄────────│  users   │
│          │  role_id│          │
│ id       │         │ id       │
│ name     │         │ name     │
│ perm_mask│         │ email    │
└──────────┘         │ role_id  │
                     │ parent_id├──┐ (self-ref)
                     └──────────┘  │
                          ▲        │
                          │        ▼
               ┌──────────────────────┐
               │   user_parent_child  │
               │                      │
               │ parent_user_id       │
               │ child_user_id (uniq) │
               └──────────────────────┘

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
   │  {user data + permission_mask}   │
```
