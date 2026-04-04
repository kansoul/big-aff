# Backend - Project Overview

## Giới thiệu

**big-ticollab** là một hệ thống quản trị (admin system) được xây dựng bằng Laravel. Hệ thống cung cấp API RESTful cho phép quản lý người dùng, phân quyền theo vai trò, và quản lý nội dung (bài viết, danh mục).

## Mục tiêu

- Cung cấp API backend cho ứng dụng web quản trị
- Hệ thống phân quyền linh hoạt dựa trên bitmask
- Quản lý phân cấp người dùng (parent-child hierarchy)
- Quản lý nội dung (bài viết, danh mục) hỗ trợ đa ngôn ngữ và đa site

## Tính năng chính

| Module | Mô tả |
|--------|-------|
| **Authentication** | Đăng nhập/đăng xuất với Laravel Sanctum (session-based) |
| **User Management** | CRUD người dùng, gán vai trò, quản lý cây phân cấp |
| **Role Management** | CRUD vai trò, cấu hình permission bằng bitmask |
| **Parent-Child Assignment** | Gán quan hệ cha-con giữa các user |
| **Categories** | Quản lý danh mục phân cấp (đã có migration) |
| **Posts** | Quản lý bài viết hỗ trợ AI, WordPress sync (đã có migration) |

## Cấu trúc thư mục

```
be/
├── app/
│   ├── Actions/              # Action classes (Auth, Role)
│   ├── Enums/                # Enumerations (Permission, RoleEnum, AuthStatus)
│   ├── Http/
│   │   ├── Controllers/Api/  # API Controllers (5 controllers)
│   │   ├── Middleware/       # Custom middlewares
│   │   ├── Requests/         # Form Request validation (6 classes)
│   │   └── Resources/        # API Resources / Transformers (3 classes)
│   ├── Models/               # Eloquent Models + Traits
│   ├── Policies/             # Authorization Policies
│   ├── Providers/            # Service Providers
│   └── Services/             # Business Logic Services (Auth, User, Role)
├── bootstrap/
│   └── app.php               # Application bootstrap
├── config/                   # Configuration files (12 files)
├── database/
│   ├── factories/            # Model factories
│   ├── migrations/           # Database migrations (7 migrations)
│   └── seeders/              # Database seeders
├── routes/
│   ├── api.php               # API routes
│   └── web.php               # Web routes
└── tests/                    # Feature & Unit tests
```

## Yêu cầu hệ thống

- PHP >= 8.3
- Composer
- SQLite (development) / MySQL (production)
- Node.js (cho Vite asset bundling nếu cần)

## Cài đặt & Chạy

```bash
cd be
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed

# Chạy development server
php artisan serve

# Hoặc chạy đồng thời với queue và log
composer run dev
```

## Biến môi trường chính

| Biến | Mô tả | Mặc định |
|------|-------|---------|
| `APP_URL` | URL của backend | `http://localhost:8000` |
| `FRONTEND_URL` | URL của frontend (CORS) | `http://localhost:5173` |
| `DB_CONNECTION` | Loại database | `sqlite` |
| `DB_DATABASE` | Đường dẫn/tên database | `database/database.sqlite` |
| `SESSION_DOMAIN` | Domain cho session cookie | `localhost` |
| `SANCTUM_STATEFUL_DOMAINS` | Domain stateful cho Sanctum | `localhost:5173,...` |
