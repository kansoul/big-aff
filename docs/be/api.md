# Backend - API Documentation

## Base URL

```
http://localhost:8000/api
```

## Xác thực (Authentication)

API sử dụng **Laravel Sanctum** với session-based authentication (stateful SPA).

**Luồng xác thực:**
1. Gọi `GET /sanctum/csrf-cookie` để nhận CSRF token
2. Gọi `POST /api/auth/login` với credentials
3. Mọi request tiếp theo đính kèm cookies (session + XSRF-TOKEN)

**Headers yêu cầu (với auth):**
```
Cookie: laravel_session=...; XSRF-TOKEN=...
X-XSRF-TOKEN: <token từ cookie>
Accept: application/json
Content-Type: application/json
```

## Response Format

`sendResponse()` trả về `response()->json($data, $code)` trực tiếp — payload đúng như controller truyền vào (thường là `{"data": ...}`), **không** có bọc mặc định `success` / `message`.

### Thành công
```json
{
  "data": { ... }
}
```

### Lỗi
```json
{
  "success": false,
  "message": "Error description",
  "data": { "field": ["validation error"] }
}
```

## HTTP Status Codes

| Code | Ý nghĩa |
|------|---------|
| `200` | Thành công |
| `201` | Tạo mới thành công |
| `401` | Chưa xác thực |
| `403` | Không có quyền |
| `404` | Không tìm thấy |
| `422` | Validation error |
| `500` | Server error |

---

## Authentication Endpoints

### Lấy CSRF Cookie

```
GET /sanctum/csrf-cookie
```

Phải gọi trước khi đăng nhập để nhận XSRF-TOKEN cookie.

**Response:** `204 No Content` + Set-Cookie header

---

### Đăng nhập

```
POST /api/auth/login
```

**Không yêu cầu** xác thực.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response thành công (200):**
```json
{
  "data": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": {
      "id": 1,
      "name": "Admin",
      "permissions": ["report.overview.view", "report.export", "settings.users.view", "settings.users.create", "settings.users.update", "settings.users.delete", "settings.roles.view", "settings.roles.create", "settings.roles.update", "settings.roles.delete", "settings.roles.assign"]
    }
  }
}
```

**Response lỗi (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

### Lấy thông tin user hiện tại

```
GET /api/auth/me
```

**Yêu cầu:** Xác thực (auth:sanctum)

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "avatar_url": null,
    "role": {
      "id": 1,
      "name": "Admin",
      "permissions": ["report.overview.view", "report.export", "settings.users.view", "settings.users.create", "settings.users.update", "settings.users.delete", "settings.roles.view", "settings.roles.create", "settings.roles.update", "settings.roles.delete", "settings.roles.assign"]
    }
  }
}
```

---

### Đăng xuất

```
POST /api/auth/logout
```

**Yêu cầu:** Xác thực (auth:sanctum)

**Response:** `204 No Content` với body rỗng (`[]`).

---

## Users Endpoints

Tất cả endpoints yêu cầu xác thực và permission tương ứng.

### Danh sách users

```
GET /api/users
```

**Permission yêu cầu:** `SettingsUsersView` (slug: `'settings.users.view'`)

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "avatar_url": null,
      "role": {
        "id": 2,
        "name": "Editor",
        "permissions": ["report.overview.view", "report.export", "settings.users.view"]
      },
      "parent": null
    }
  ]
}
```

---

### Tạo user mới

```
POST /api/users
```

**Permission yêu cầu:** `SettingsUsersCreate` (slug: `'settings.users.create'`)

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "role_id": 2
}
```

**Response (200):**
```json
{
  "data": {
    "id": 5,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": { ... }
  }
}
```

**Validation errors (422):**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "email": ["The email has already been taken."],
    "password": ["The password confirmation does not match."]
  }
}
```

---

### Cập nhật user

```
PUT /api/users/{user}
```

**Permission yêu cầu:** `SettingsUsersUpdate` (slug: `'settings.users.update'`)

**Path Parameters:**
- `user` — ID của user cần cập nhật

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "role_id": 3,
  "password": "newpassword",          // optional
  "password_confirmation": "newpassword"  // optional
}
```

**Response (200):**
```json
{
  "data": { ... }
}
```

---

### Xóa user

```
DELETE /api/users/{user}
```

**Permission yêu cầu:** `SettingsUsersDelete` (slug: `'settings.users.delete'`)

**Path Parameters:**
- `user` — ID của user cần xóa

**Response:** `204 No Content` với body rỗng (`[]`).

---

## Parent-Child Assignment Endpoints

### Danh sách quan hệ cha-con

```
GET /api/users/parent-child-assignments
```

**Permission yêu cầu:** `SettingsUsersView` (slug: `'settings.users.view'`)

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "parent": {
        "id": 1,
        "name": "Manager A",
        "email": "manager@example.com"
      },
      "child": {
        "id": 3,
        "name": "Employee B",
        "email": "employee@example.com"
      }
    }
  ]
}
```

---

### Cập nhật quan hệ cha-con của user

```
PUT /api/users/{user}/parent-children
```

**Permission yêu cầu:** `SettingsUsersUpdate` (slug: `'settings.users.update'`)

**Path Parameters:**
- `user` — ID của parent user

**Request Body:**
```json
{
  "child_user_ids": [3, 4, 5]
}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "parent": { "id": 1, "name": "Manager A", "email": "manager@example.com" },
      "child": { "id": 3, "name": "Employee B", "email": "employee@example.com" }
    }
  ]
}
```

---

## Roles Endpoints

### Danh sách roles

```
GET /api/roles
```

**Permission yêu cầu:** `SettingsRolesView` (slug: `'settings.roles.view'`) **HOẶC** `SettingsUsersCreate` (slug: `'settings.users.create'`) **HOẶC** `SettingsUsersUpdate` (slug: `'settings.users.update'`)

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Admin",
      "permissions": ["report.overview.view", "report.export", "settings.users.view", "settings.users.create", "settings.users.update", "settings.users.delete", "settings.roles.view", "settings.roles.create", "settings.roles.update", "settings.roles.delete", "settings.roles.assign"]
    },
    {
      "id": 2,
      "name": "Editor",
      "permissions": ["report.overview.view", "report.export", "settings.users.view"]
    }
  ]
}
```

---

### Tạo role mới

```
POST /api/roles
```

**Permission yêu cầu:** `SettingsRolesCreate` (slug: `'settings.roles.create'`)

**Request Body:**
```json
{
  "name": "Moderator",
  "permissions": ["settings.users.view", "settings.roles.view", "settings.roles.create"]
}
```

**Response (200):**
```json
{
  "data": {
    "id": 4,
    "name": "Moderator",
    "permissions": ["settings.users.view", "settings.roles.view", "settings.roles.create"]
  }
}
```

---

### Cập nhật role

```
PUT /api/roles/{role}
```

**Permission yêu cầu:** `SettingsRolesUpdate` (slug: `'settings.roles.update'`) **HOẶC** `SettingsRolesAssign` (slug: `'settings.roles.assign'`)

**Path Parameters:**
- `role` — ID của role cần cập nhật

**Request Body:**
```json
{
  "name": "Moderator",
  "permissions": ["settings.users.view", "settings.roles.view", "settings.roles.update"]
}
```

**Response (200):**
```json
{
  "data": { ... }
}
```

---

### Xóa role

```
DELETE /api/roles/{role}
```

**Permission yêu cầu:** `SettingsRolesDelete` (slug: `'settings.roles.delete'`)

**Path Parameters:**
- `role` — ID của role cần xóa

**Response:** `204 No Content` với body rỗng (`[]`).

---

## Permission Slugs Reference

Mỗi quyền là một **chuỗi slug** cố định; lưu trong bảng pivot `role_permissions` và dùng trong middleware `permission.scope:` (có thể nối nhiều slug bằng `|`).

| Permission (enum) | Slug | Mô tả |
|-------------------|------|-------|
| `ReportOverviewView` | `report.overview.view` | Xem trang tổng quan báo cáo |
| `ReportExport` | `report.export` | Xuất báo cáo |
| `SettingsUsersView` | `settings.users.view` | Xem danh sách users |
| `SettingsUsersCreate` | `settings.users.create` | Tạo user mới |
| `SettingsUsersUpdate` | `settings.users.update` | Cập nhật user |
| `SettingsUsersDelete` | `settings.users.delete` | Xóa user |
| `SettingsRolesView` | `settings.roles.view` | Xem danh sách roles |
| `SettingsRolesCreate` | `settings.roles.create` | Tạo role mới |
| `SettingsRolesUpdate` | `settings.roles.update` | Cập nhật role |
| `SettingsRolesDelete` | `settings.roles.delete` | Xóa role |
| `SettingsRolesAssign` | `settings.roles.assign` | Gán / đồng bộ permissions cho role |

**Ví dụ role “full admin” (tất cả slug):** trả về trong API dưới dạng mảng `permissions` gồm đủ 11 slug ở trên.

**Gán quyền cho role:** gửi `permissions: string[]` trong body `POST /api/roles` hoặc `PUT /api/roles/{role}` (giá trị hợp lệ = các slug trong bảng trên).

---

## Error Responses

### 401 Unauthenticated
```json
{
  "message": "Unauthenticated."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "This action is unauthorized."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "success": false,
  "message": "The given data was invalid.",
  "data": {
    "email": ["The email field is required."],
    "name": ["The name must be at least 2 characters."]
  }
}
```
