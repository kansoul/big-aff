---
name: laravel-crud
description: "Use this skill whenever implementing CRUD (Create/Read/Update/Delete) endpoints in this repo’s Laravel backend. Follows the project’s current conventions: API controllers extend App\\Http\\Controllers\\API\\BaseController (sendResponse/sendError), validation via FormRequest, transformation via JsonResource, and business logic placed in Services/ + optional Actions/. Includes route patterns (routes/api.php), Sanctum middleware usage, pagination, filtering, and PHPUnit feature tests."
license: MIT
metadata:
  author: big-ticollab
  domain: backend
  triggers: CRUD, create endpoint, update endpoint, delete endpoint, list endpoint, apiResource, controller, form request, json resource, feature test, phpunit, sanctum
  role: specialist
  scope: implementation
  output-format: code
---

# Laravel BE CRUD (project conventions)

Skill này chuẩn hoá cách làm CRUD cho BE Laravel trong repo này. Ưu tiên **consistency**: luôn nhìn các file hiện có (ví dụ `AuthController`, `BaseController`, `routes/api.php`) và làm giống.

## Project conventions you MUST follow here

- **Standard API responses**: Controller nên extend `App\Http\Controllers\API\BaseController` và dùng:
  - `sendResponse($data, $message = 'Success', $code = 200)`
  - `sendError($error, $errorMessages = [], $code = 404)`
- **Validation**: dùng `FormRequest` và luôn gọi `$request->validated()` (không dùng `$request->all()`).
- **Transform output**: dùng `App\Http\Resources\*Resource` (`JsonResource`) cho `show`/`index` payload.
- **Business logic placement**:
  - Mặc định: `App\Services\<Domain>\<Entity>Service`
  - Nếu logic lớn/đa bước: tách `App\Actions\<Domain>\*Action` và inject vào Service (như `AuthService`).
- **Routes**: API routes nằm ở `be/routes/api.php`. Dùng `Route::middleware('auth:sanctum')` cho endpoints cần auth.
- **Testing**: viết **PHPUnit** feature tests (repo dùng PHPUnit v12). Không tạo Pest mới.
- **Best practices (required)**: khi tạo CRUD, bắt buộc tuân thủ skill `be/.agents/skills/laravel-best-practices` (performance, security, validation, routing, testing, architecture). Nếu có xung đột nhỏ giữa “template CRUD” và best-practices thì ưu tiên **best-practices + conventions đang tồn tại trong codebase**.

## CRUD blueprint (no new table by default)

Mặc định skill này **KHÔNG tạo bảng/migration mới**. Giả định bảng + model đã tồn tại; ta chỉ bổ sung API CRUD theo conventions dự án.

### 1) Requests (Create/Update)

Tạo request riêng (follow conventions của repo; nếu project chưa dùng `GetList...Request` thì đừng tự ý introduce):

- `Store<Entity>Request`
- `Update<Entity>Request`
- (Optional) `GetList<Entity>Request` (khi filter/sort/paginate phức tạp)

Rules nên tối ưu cho CRUD:

- Dùng `sometimes`/`filled` cho update.
- Dùng `Rule::unique()->ignore($modelId)` khi update unique fields.
- Với FK/relations: validate tồn tại bằng `exists:*` (tránh lỗi integrity + tăng clarity).

### 2) Resource

Tạo `<Entity>Resource`:

- `toArray()` chỉ trả các fields cần thiết.
- Với relations: dùng `whenLoaded()` để không gây query ngầm.

### 3) Service (+ optional Actions)

Tạo `App\Services\<Domain>\<Entity>Service` cung cấp các methods:

- `list(array $filters): LengthAwarePaginator|Collection`
- `create(array $data): <Entity>`
- `update(<Entity> $entity, array $data): <Entity>`
- `delete(<Entity> $entity): void`

Nếu cần transactions/side effects (events/jobs/files):

- Tổ chức bằng Actions hoặc methods private trong Service.
- Bao bằng `DB::transaction()` khi multi-write.

### 4) Controller (API)

Tạo controller ở `App\Http\Controllers\Api\<Domain>` (hoặc `Api` cùng pattern hiện có), extends `BaseController`, methods:

- `index()`:
  - accept filter params (tối thiểu: `per_page`, `page`, optional `q`).
  - return `sendResponse(Resource::collection($paginator), '...')`
- `store(StoreRequest $request)`:
  - `$entity = $service->create($request->validated())`
  - return `sendResponse(new Resource($entity), 'Created', 201)`
- `show(<Entity> $entity)`:
  - implicit route model binding
  - return `sendResponse(new Resource($entity), 'Retrieved')`
- `update(UpdateRequest $request, <Entity> $entity)`:
  - return `sendResponse(new Resource($updated), 'Updated')`
- `destroy(<Entity> $entity)`:
  - delete + return `sendResponse(null, 'Deleted')`

Error handling:

- Validation errors: để Laravel trả 422 (mặc định). Không bọc try/catch trừ khi convert domain exceptions.
- Domain errors: trả `sendError()` với HTTP code phù hợp.

### 5) Routes

Trong `be/routes/api.php`:

- Với resource public: `Route::apiResource('entities', EntityController::class);`
- Với resource cần auth:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('entities', EntityController::class);
});
```

Nếu chỉ cần subset methods: dùng `->only([...])` hoặc `->except([...])`.

### 6) PHPUnit feature tests

Tối thiểu test:

- **index**: trả đúng shape JSON, pagination ok (nếu dùng paginate)
- **store**: 201 + record created
- **show**: 200 + đúng data
- **update**: 200 + record updated
- **destroy**: 200 + record deleted
- **authorization**: endpoints dưới sanctum phải 401 nếu unauth

Assertions ưu tiên:

- `assertOk()/assertCreated()`
- `assertJsonPath('success', true)`
- `assertDatabaseHas()/assertDatabaseMissing()` (hoặc helpers nếu project có)

### (Optional) Database artifacts (ONLY when explicitly needed)

Chỉ tạo các phần này khi user yêu cầu hoặc bảng/model chưa tồn tại:

- **Migration**: tạo bảng + indexes + foreign keys.
- **Model**:
  - Khai báo `$fillable` hoặc `$guarded`.
  - Khai báo `$casts`.
  - Define relationships; eager-load ở query call site để tránh N+1.
- **Factory**: tạo factory để phục vụ tests.

## Response shape (must match BaseController)

Tất cả endpoint “happy path” dùng `sendResponse()` sẽ có shape:

```json
{
  "success": true,
  "data": "...",
  "message": "..."
}
```

Error dùng `sendError()`:

```json
{
  "success": false,
  "message": "...",
  "data": null,
  "errors": { }
}
```

## Quick checklist before you finish

- Controller extends đúng `App\Http\Controllers\API\BaseController` và return `sendResponse/sendError`.
- Index có paginate hoặc limit hợp lý (không trả toàn bộ nếu bảng lớn).
- Không N+1 (eager-load relations ở query nếu resource cần).
- Requests dùng `$request->validated()`.
- Resource dùng `whenLoaded()` cho relations.
- Có PHPUnit feature tests cho CRUD chính + auth (nếu có).
- Theo `laravel-best-practices`: authorize (policies/gates nếu có), không expose fields nhạy cảm trong Resource, tránh query builder/raw SQL với input user, và chạy `vendor/bin/pint --dirty --format agent` sau khi sửa PHP files.

