# Backend — Laravel API

## Yêu cầu

- PHP >= 8.4
- Composer
- Node.js & npm
- MySQL

## Cài đặt

### 1. Cài dependencies
- cài đặt nginx

```bash
composer install
npm install
```

### 2. Tạo file cấu hình

```bash
cp .env.example .env
php artisan key:generate

php artisan install:api
```
### Cấu hình database

Mặc định dùng **SQLite**. Để chuyển sang MySQL, cập nhật `.env`:

```env
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### 3. Chạy migration

```bash
php artisan migrate
```

### 4. Build assets

```bash
npm run build
```

---

Lệnh này khởi động đồng thời:

| Tiến trình | Mô tả |
|------------|-------|
| `php artisan serve --port=8000` | HTTP server tại `http://localhost:8000` |
| `php artisan queue:listen` | Worker xử lý queue |

