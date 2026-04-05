# Backend - Tech Stack

## Core Framework & Language

| Thành phần | Phiên bản | Mô tả |
|-----------|-----------|-------|
| **PHP** | >= 8.3 | Ngôn ngữ lập trình chính |
| **Laravel** | 13.x | PHP framework chính |
| **Composer** | latest | Package manager cho PHP |

## Authentication & Authorization

| Thành phần | Mô tả |
|-----------|-------|
| **Laravel Sanctum** | Xác thực session-based (stateful) cho SPA |
| **Laravel Policies** | Phân quyền ở cấp model/controller |
| **String Permission Enum** | Hệ thống quyền tùy chỉnh dựa trên string slugs + role_permissions pivot |

## Database & ORM

| Thành phần | Phiên bản | Mô tả |
|-----------|-----------|-------|
| **Eloquent ORM** | (Laravel built-in) | ORM chính cho database |
| **SQLite** | 3.x | Database mặc định cho development |
| **MySQL** | 8.x | Database khuyến nghị cho production |
| **Laravel Migrations** | (Laravel built-in) | Quản lý schema database |

## API & HTTP

| Thành phần | Mô tả |
|-----------|-------|
| **Laravel API Resources** | Transform Eloquent models sang JSON response |
| **Form Requests** | Validate input data với rules |
| **CORS (fruitcake/laravel-cors)** | Xử lý Cross-Origin Resource Sharing |
| **JSON API responses** | Response chuẩn hóa qua `BaseController` |

## Development Tools

| Thành phần | Mô tả |
|-----------|-------|
| **Laravel Pint** | Code style fixer (PSR-12) |
| **PHPUnit** | Testing framework |
| **Laravel Telescope** | Debug & monitoring (optional) |
| **Faker** | Tạo dữ liệu giả cho seeders/factories |

## Kiến trúc phụ thuộc (composer.json)

```json
{
  "require": {
    "php": "^8.3",
    "laravel/framework": "^13.0",
    "laravel/sanctum": "^4.0",
    "laravel/tinker": "^2.10"
  },
  "require-dev": {
    "fakerphp/faker": "^1.23",
    "laravel/pint": "^1.13",
    "phpunit/phpunit": "^11.0"
  }
}
```

## Design Patterns sử dụng

| Pattern | Áp dụng ở đâu |
|---------|--------------|
| **Service Layer** | `app/Services/` — tách business logic khỏi controller |
| **Action Classes** | `app/Actions/` — đóng gói từng operation cụ thể |
| **Repository-like Traits** | Model traits cho scopes, relationships |
| **Form Request Objects** | Validation tách biệt khỏi controller |
| **API Resources** | Transform data trước khi trả về client |
| **Trait-Based Model Composition** | Tách model logic thành nhiều traits |
| **Policy-Based Authorization** | Phân quyền tập trung, tái sử dụng được |
