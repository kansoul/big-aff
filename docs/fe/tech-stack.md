# Frontend - Tech Stack

## Core Framework & Language

| Thành phần | Phiên bản | Mô tả |
|-----------|-----------|-------|
| **TypeScript** | 5.9 | Ngôn ngữ chính, strict mode |
| **React** | 19.x | UI framework |
| **Vite** | 8.x | Build tool + dev server |

## Routing

| Thành phần | Phiên bản | Mô tả |
|-----------|-----------|-------|
| **React Router** | 7.x | Client-side routing, `createBrowserRouter` |

## Styling & UI

| Thành phần | Phiên bản | Mô tả |
|-----------|-----------|-------|
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **shadcn/ui** | latest | Component library (Radix UI-based) |
| **CVA (class-variance-authority)** | latest | Variant-based component styling |
| **Mantine** | 6.x | UI component library (tables, modals, etc.) |
| **mantine-react-table** | latest | Bảng dữ liệu với Mantine |
| **lucide-react** | latest | Icon library (shadcn/ui default) |
| **@tabler/icons-react** | latest | Icon library thêm |

## Forms & Validation

| Thành phần | Phiên bản | Mô tả |
|-----------|-----------|-------|
| **react-hook-form** | latest | Form state management |
| **Zod** | latest | Schema validation |
| **@hookform/resolvers** | latest | Tích hợp Zod với RHF |

## HTTP & State

| Thành phần | Phiên bản | Mô tả |
|-----------|-----------|-------|
| **axios** | latest | HTTP client, hỗ trợ CSRF + credentials |
| **Zustand** | latest | Global state management |

## Data & Utilities

| Thành phần | Mô tả |
|-----------|-------|
| **recharts** | Biểu đồ và charts |
| **dayjs** | Xử lý ngày tháng |
| **clsx** | Conditional className |
| **tailwind-merge** | Merge Tailwind classes |

## TypeScript Configuration

- **Strict mode** bật toàn bộ (`strict: true`)
- **Path aliases**: `@/` → `src/`
- **Module resolution**: `bundler` (Vite-optimized)
- **Target**: ES2020

## Cấu hình Vite

```typescript
// vite.config.ts
{
  plugins: [react()],
  resolve: {
    alias: { "@": "/src" }
  },
  server: {
    port: 5173
  }
}
```

## Dependencies nổi bật

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "axios": "^1.x",
    "zustand": "^5.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@hookform/resolvers": "^3.x",
    "tailwind-merge": "^2.x",
    "clsx": "^2.x",
    "lucide-react": "latest",
    "recharts": "^2.x",
    "dayjs": "^1.x",
    "@mantine/core": "^6.x",
    "mantine-react-table": "latest"
  },
  "devDependencies": {
    "typescript": "^5.9",
    "vite": "^8.0",
    "@vitejs/plugin-react": "latest",
    "tailwindcss": "^4.x"
  }
}
```
