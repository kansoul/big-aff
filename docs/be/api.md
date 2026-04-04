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

### Thành công
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
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
  "success": true,
  "data": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": {
      "id": 1,
      "name": "Admin",
      "permission_mask": 2047
    }
  },
  "message": "Login successful"
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
  "success": true,
  "data": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "avatar_url": null,
    "role": {
      "id": 1,
      "name": "Admin",
      "permission_mask": 2047
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

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Users Endpoints

Tất cả endpoints yêu cầu xác thực và permission tương ứng.

### Danh sách users

```
GET /api/users
```

**Permission yêu cầu:** `SettingsUsersView` (bit 2 = 4)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "avatar_url": null,
      "role": {
        "id": 2,
        "name": "Editor",
        "permission_mask": 7
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

**Permission yêu cầu:** `SettingsUsersCreate` (bit 3 = 8)

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
  "success": true,
  "data": {
    "id": 5,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": { ... }
  },
  "message": "User created successfully"
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

**Permission yêu cầu:** `SettingsUsersUpdate` (bit 4 = 16)

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
  "success": true,
  "data": { ... },
  "message": "User updated successfully"
}
```

---

### Xóa user

```
DELETE /api/users/{user}
```

**Permission yêu cầu:** `SettingsUsersDelete` (bit 5 = 32)

**Path Parameters:**
- `user` — ID của user cần xóa

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Parent-Child Assignment Endpoints

### Danh sách quan hệ cha-con

```
GET /api/users/parent-child-assignments
```

**Permission yêu cầu:** `SettingsUsersView` (bit 2 = 4)

**Response (200):**
```json
{
  "success": true,
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

**Permission yêu cầu:** `SettingsUsersUpdate` (bit 4 = 16)

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
  "success": true,
  "message": "Parent-child assignments updated"
}
```

---

## Roles Endpoints

### Danh sách roles

```
GET /api/roles
```

**Permission yêu cầu:** `SettingsRolesView` (64) **HOẶC** `SettingsUsersCreate` (8) **HOẶC** `SettingsUsersUpdate` (16)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Admin",
      "permission_mask": 2047
    },
    {
      "id": 2,
      "name": "Editor",
      "permission_mask": 7
    }
  ]
}
```

---

### Tạo role mới

```
POST /api/roles
```

**Permission yêu cầu:** `SettingsRolesCreate` (bit 7 = 128)

**Request Body:**
```json
{
  "name": "Moderator",
  "permission_mask": 196
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "Moderator",
    "permission_mask": 196
  },
  "message": "Role created successfully"
}
```

---

### Cập nhật role

```
PUT /api/roles/{role}
```

**Permission yêu cầu:** `SettingsRolesUpdate` (256) **HOẶC** `SettingsRolesAssign` (1024)

**Path Parameters:**
- `role` — ID của role cần cập nhật

**Request Body:**
```json
{
  "name": "Moderator",
  "permission_mask": 324
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Role updated successfully"
}
```

---

### Xóa role

```
DELETE /api/roles/{role}
```

**Permission yêu cầu:** `SettingsRolesDelete` (bit 9 = 512)

**Path Parameters:**
- `role` — ID của role cần xóa

**Response (200):**
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

---

## Permission Bits Reference

| Permission | Bit | Giá trị | Mô tả |
|-----------|-----|---------|-------|
| `ReportOverviewView` | 0 | 1 | Xem trang tổng quan báo cáo |
| `ReportExport` | 1 | 2 | Xuất báo cáo |
| `SettingsUsersView` | 2 | 4 | Xem danh sách users |
| `SettingsUsersCreate` | 3 | 8 | Tạo user mới |
| `SettingsUsersUpdate` | 4 | 16 | Cập nhật user |
| `SettingsUsersDelete` | 5 | 32 | Xóa user |
| `SettingsRolesView` | 6 | 64 | Xem danh sách roles |
| `SettingsRolesCreate` | 7 | 128 | Tạo role mới |
| `SettingsRolesUpdate` | 8 | 256 | Cập nhật role |
| `SettingsRolesDelete` | 9 | 512 | Xóa role |
| `SettingsRolesAssign` | 10 | 1024 | Gán role cho user |

**Full permissions mask:** `2047` (tất cả 11 bits = `11111111111` nhị phân)

**Ví dụ tính permission_mask:**
```
Admin = View + Create + Update + Delete Users + View + Create + Update + Delete + Assign Roles
      = 4 + 8 + 16 + 32 + 64 + 128 + 256 + 512 + 1024
      = 2044 (không bao gồm Report)
```

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
