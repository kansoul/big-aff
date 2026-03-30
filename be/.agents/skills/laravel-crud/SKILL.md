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

This skill standardizes how to implement CRUD for the Laravel backend in this repo. **Consistency** comes first: always mirror existing files (for example `AuthController`, `BaseController`, `routes/api.php`) and match their patterns.

For folder locations (`routes/`, `app/Http/Controllers/Api/`, `app/Models/Traits/`, …), align with **Repository layout** in **`be/.agents/skills/laravel-best-practices/SKILL.md`**.

## Project conventions you MUST follow here

- **Standard API responses**: Controllers should extend `App\Http\Controllers\API\BaseController` and use:
  - `sendResponse($data, $message = 'Success', $code = 200)`
  - `sendError($error, $errorMessages = [], $code = 404)`
- **Validation**: use `FormRequest` and always call `$request->validated()` (do not use `$request->all()`).
- **Transform output**: use `App\Http\Resources\*Resource` (`JsonResource`) for `show`/`index` payloads.
- **Business logic placement**:
  - Default: `App\Services\<Domain>\<Entity>Service`
  - For large or multi-step logic: split into `App\Actions\<Domain>\*Action` and inject into the Service (as with `AuthService`).
- **Model composition rule (project-specific)**:
  - Keep Eloquent model classes thin.
  - Put model behavior in traits under `App\Models\Traits\...` (for example relationship/scope/attribute/method/observer traits).
  - When adding or changing model functionality, create or edit the corresponding trait and only wire it in the model via `use`.
- **Routes**: API routes live in `be/routes/api.php`. Use `Route::middleware('auth:sanctum')` for endpoints that require authentication.
- **Testing**: write **PHPUnit** feature tests (this repo uses PHPUnit v12). Do not add new Pest tests.
- **Best practices (required)**: when building CRUD, you must follow the `be/.agents/skills/laravel-best-practices` skill (performance, security, validation, routing, testing, architecture). If there is a minor conflict between a “CRUD template” and best practices, prefer **best practices + conventions already present in the codebase**.

## CRUD blueprint (no new table by default)

By default this skill **does NOT create new tables/migrations**. It assumes the table and model already exist; you only add CRUD APIs following project conventions.

### 1) Requests (Create/Update)

Create dedicated request classes (follow repo conventions; if the project does not use `GetList...Request`, do not introduce it on your own):

- `Store<Entity>Request`
- `Update<Entity>Request`
- (Optional) `GetList<Entity>Request` (when filter/sort/pagination is complex)

Rules that work well for CRUD:

- Use `sometimes`/`filled` for updates.
- Use `Rule::unique()->ignore($modelId)` when updating unique fields.
- For foreign keys/relations: validate existence with `exists:*` (avoids integrity issues and clarifies intent).

### 2) Resource

Create `<Entity>Resource`:

- `toArray()` returns only the fields you need.
- For relations: use `whenLoaded()` to avoid implicit queries.

### 3) Service (+ optional Actions)

Create `App\Services\<Domain>\<Entity>Service` with methods:

- `list(array $filters): LengthAwarePaginator|Collection`
- `create(array $data): <Entity>`
- `update(<Entity> $entity, array $data): <Entity>`
- `delete(<Entity> $entity): void`

When you need transactions or side effects (events/jobs/files):

- Structure with Actions or private methods on the Service.
- Wrap multi-writes in `DB::transaction()`.

### 4) Controller (API)

Create the controller under `app/Http/Controllers/Api/` (namespace **`App\Http\Controllers\Api\...`** or nested such as **`App\Http\Controllers\Api\Auth`** — **match sibling controllers** in the same folder). Extend **`App\Http\Controllers\API\BaseController`** (see `app/Http/Controllers/Api/BaseController.php`), with methods:

- `index()`:
  - accept filter params (at minimum: `per_page`, `page`, optional `q`).
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
  - delete and return `sendResponse(null, 'Deleted')`

Error handling:

- Validation errors: let Laravel return 422 (default). Avoid try/catch unless you are converting domain exceptions.
- Domain errors: return `sendError()` with an appropriate HTTP status code.

### 5) Routes

In `be/routes/api.php`:

- For a public resource: `Route::apiResource('entities', EntityController::class);`
- For an authenticated resource:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('entities', EntityController::class);
});
```

If you only need a subset of actions: use `->only([...])` or `->except([...])`.

**Authorization beyond Sanctum (this repo):** when an endpoint must require a specific **permission bit**, chain middleware `permission.scope:{value}` where `{value}` is `Permission::YourCase->value` (integer), or pipe-separated alternatives (**digits only**; full-access users are handled via an all-bits-set role mask, not a wildcard token). Do **not** invent bits that are not on `App\Enums\Permission`. For Form Request `authorize()` and policies, use `hasPermissionFlag(Permission::...)`. See **`laravel-best-practices`** → Permissions (bitmask).

### 6) PHPUnit feature tests

Minimum coverage:

- **index**: correct JSON shape, pagination OK (if you paginate)
- **store**: 201 + record created
- **show**: 200 + correct data
- **update**: 200 + record updated
- **destroy**: 200 + record deleted
- **authorization**: Sanctum-protected endpoints must return 401 when unauthenticated

Prefer assertions such as:

- `assertOk()/assertCreated()`
- `assertJsonPath('success', true)`
- `assertDatabaseHas()/assertDatabaseMissing()` (or project helpers if any)

### (Optional) Database artifacts (ONLY when explicitly needed)

Create these only when the user asks or the table/model does not exist yet:

- **Migration**: table + indexes + foreign keys.
- **Model**:
  - Declare `$fillable` or `$guarded`.
  - Declare `$casts`.
  - Define relationships; eager-load at the query call site to avoid N+1.
- **Factory**: add a factory to support tests.

## Response shape (must match BaseController)

All “happy path” endpoints using `sendResponse()` share this shape:

```json
{
  "success": true,
  "data": "...",
  "message": "..."
}
```

Errors use `sendError()`:

```json
{
  "success": false,
  "message": "...",
  "data": null,
  "errors": { }
}
```

## Quick checklist before you finish

- Controller correctly extends `App\Http\Controllers\API\BaseController` and returns `sendResponse`/`sendError`.
- `index` uses pagination or a sensible limit (do not return the full table for large datasets).
- No N+1 (eager-load relations in the query when the resource needs them).
- Requests use `$request->validated()`.
- Resource uses `whenLoaded()` for relations.
- PHPUnit feature tests cover the main CRUD flows + auth (if applicable).
- Follow `laravel-best-practices`: authorize (policies/gates when applicable), do not expose sensitive fields in Resources, avoid query builder/raw SQL with raw user input, and run `vendor/bin/pint --dirty --format agent` after editing PHP files.
