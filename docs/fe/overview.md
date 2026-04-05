# Frontend - Project Overview

## Giới thiệu

Frontend của **big-ticollab** là một Single Page Application (SPA) được xây dựng bằng React + TypeScript. Ứng dụng cung cấp giao diện quản trị để quản lý người dùng, phân quyền theo vai trò, và các tính năng khác của hệ thống.

## Mục tiêu

- Giao diện quản trị hiện đại, responsive
- Tích hợp xác thực với Laravel Sanctum (session-based)
- Phân quyền UI dựa trên permission string slugs (đồng bộ với backend)
- Kiến trúc module hóa, dễ mở rộng

## Tính năng chính

| Module | Mô tả |
|--------|-------|
| **Authentication** | Đăng nhập/đăng xuất, lưu trạng thái user |
| **Dashboard** | Trang tổng quan sau khi đăng nhập |
| **Users Management** | Xem, thêm, sửa, xóa users |
| **Roles Management** | Xem, thêm, sửa, xóa roles + cấu hình permissions |
| **Parent-Child Assignment** | Quản lý quan hệ phân cấp giữa users |

## Cấu trúc thư mục

```
fe/src/
├── app/
│   ├── providers/          # React context providers (Theme, App)
│   └── router/             # Route guards (ProtectedRoute, RequirePermission)
├── components/             # Shared UI components (shadcn/ui + custom)
├── constants/
│   ├── paths.ts            # Tất cả route paths
│   ├── permissions.ts      # Permission slugs (đồng bộ với PHP enum)
│   └── headerNavItems.ts   # Navigation menu items
├── features/
│   ├── auth/               # Đăng nhập, types, API calls
│   ├── dashboard/          # Trang tổng quan
│   ├── settings/           # Quản lý roles
│   └── users/              # Quản lý users + parent-child
├── hooks/                  # Custom React hooks
├── layouts/                # Layout components (Auth, Dashboard)
├── lib/                    # Utility functions
├── routes/
│   └── index.tsx           # Router configuration (lazy-loaded)
├── shared/                 # Shared types + axios instance
└── config/
    └── index.ts            # Environment config (API URL, app title)
```

## Cài đặt & Chạy

```bash
cd fe
npm install
cp .env.example .env
# Cập nhật VITE_API_URL trong .env

npm run dev      # Development server (localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
```

## Biến môi trường

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `VITE_API_URL` | URL của backend API | `http://localhost:8000` |
| `VITE_APP_TITLE` | Tiêu đề ứng dụng | `Big Ticollab` |
| `VITE_STRICT_MODE` | Bật React Strict Mode | `true` |

## Yêu cầu hệ thống

- Node.js >= 18
- npm >= 9
