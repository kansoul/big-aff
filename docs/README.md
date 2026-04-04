# big-ticollab - Documentation

Tài liệu kỹ thuật của dự án **big-ticollab** — hệ thống quản trị full-stack với Laravel backend và React frontend.

## Cấu trúc tài liệu

```
docs/
├── be/                     # Backend documentation
│   ├── overview.md         # Giới thiệu, cài đặt, cấu trúc dự án
│   ├── architecture.md     # Kiến trúc, luồng xử lý, permission system
│   ├── api.md              # API endpoints đầy đủ
│   └── tech-stack.md       # Tech stack và dependencies
└── fe/                     # Frontend documentation
    ├── overview.md         # Giới thiệu, cài đặt, cấu trúc dự án
    ├── architecture.md     # Kiến trúc, routing, state management
    └── tech-stack.md       # Tech stack và dependencies
```

## Quick Reference

### Backend (Laravel 13 + PHP 8.3)

| Tài liệu | Nội dung |
|---------|---------|
| [Overview](be/overview.md) | Project overview, cài đặt, env vars |
| [Architecture](be/architecture.md) | Layered architecture, permission system, DB schema |
| [API](be/api.md) | Tất cả API endpoints với request/response examples |
| [Tech Stack](be/tech-stack.md) | Frameworks, libraries, design patterns |

### Frontend (React 19 + TypeScript)

| Tài liệu | Nội dung |
|---------|---------|
| [Overview](fe/overview.md) | Project overview, cài đặt, env vars |
| [Architecture](fe/architecture.md) | Feature-driven architecture, routing, state, API layer |
| [Tech Stack](fe/tech-stack.md) | Frameworks, libraries, Tailwind, shadcn/ui |

## Tech Stack tóm tắt

| | Backend | Frontend |
|-|---------|---------|
| **Language** | PHP 8.3 | TypeScript 5.9 |
| **Framework** | Laravel 13 | React 19 |
| **Auth** | Laravel Sanctum | Axios + cookies |
| **Database** | SQLite / MySQL | — |
| **Styling** | — | Tailwind 4 + shadcn/ui |
| **State** | — | Zustand |
| **Forms** | Form Requests | react-hook-form + Zod |
| **Build** | Composer | Vite 8 |

## API Base URL

```
Development: http://localhost:8000/api
```

## Chạy dự án

```bash
# Backend
cd be && composer install && php artisan migrate --seed && php artisan serve

# Frontend
cd fe && npm install && npm run dev
```
