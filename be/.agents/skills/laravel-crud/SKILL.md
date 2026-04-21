---
name: laravel-crud
description: "Use this skill whenever implementing CRUD (Create/Read/Update/Delete) endpoints in this repo's Laravel backend. Follows the project's current conventions: API controllers extend App\\Http\\Controllers\\API\\BaseController (sendResponse/sendError), validation via FormRequest, transformation via JsonResource, and business logic placed in Services/ + optional Actions/. Includes route patterns (routes/api.php), Sanctum middleware usage, pagination, filtering, and PHPUnit feature tests."
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

- **Standard API responses**: Controllers should extend `App\Http\Controllers\Api\BaseController` and use:
    - `sendResponse(mixed $data, int $code = 200)` — returns `response()->json($data, $code)` directly; controllers build the response array themselves (e.g. `['data' => new Resource($entity)]`).
    - `sendError(string $error, array $errorMessages = [], int $code = 404)` — returns `{"success": false, "message": "...", "data": null}` (plus `"errors"` when provided).
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
- **Best practices (required)**: when building CRUD, you must follow the `be/.agents/skills/laravel-best-practices` skill (performance, security, validation, routing, testing, architecture). If there is a minor conflict between a "CRUD template" and best practices, prefer **best practices + conventions already present in the codebase**.

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

Create the controller under `app/Http/Controllers/Api/` (namespace **`App\Http\Controllers\Api\...`** or nested such as **`App\Http\Controllers\Api\Auth`** — **match sibling controllers** in the same folder). Extend **`App\Http\Controllers\Api\BaseController`** (see `app/Http/Controllers/Api/BaseController.php`), with methods:

- `index()`:
    - accept filter params (at minimum: `per_page`, `page`, optional `q`).
    - return `$this->sendResponse(['data' => Resource::collection($items), 'pagination' => $this->parsePagination($paginator)])` (or without pagination if not paginating).
- `store(StoreRequest $request)`:
    - `$entity = $service->create($request->validated())`
    - return `$this->sendResponse(['data' => new Resource($entity)])`
- `show(<Entity> $entity)`:
    - implicit route model binding
    - return `$this->sendResponse(['data' => new Resource($entity)])`
- `update(UpdateRequest $request, <Entity> $entity)`:
    - return `$this->sendResponse(['data' => new Resource($updated)])`
- `destroy(<Entity> $entity)`:
    - delete and return `$this->sendResponse([], Response::HTTP_NO_CONTENT)`

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

**Authorization beyond Sanctum (this repo):** when an endpoint must require a specific **permission**, chain middleware `permission.scope:{value}` where `{value}` is `Permission::YourCase->value` (string slug), or pipe-separated alternatives (e.g. `'settings.roles.update|settings.roles.assign'`). Full-access users are handled by having every defined permission slug in `role_permissions`, not a wildcard. Do **not** invent slugs that are not on `App\Enums\Permission`. For Form Request `authorize()` and policies, use `hasPermissionFlag(Permission::...)`. See **`laravel-best-practices`** → Permissions (string slugs).

### (Optional) Database artifacts (ONLY when explicitly needed)

Create these only when the user asks or the table/model does not exist yet:

- **Migration**: table + indexes + foreign keys.
- **Model**:
    - Declare `$fillable` or `$guarded`.
    - Declare `$casts`.
    - Define relationships; eager-load at the query call site to avoid N+1.
- **Factory**: add a factory to support tests.

## Response shape (must match BaseController)

`sendResponse(mixed $data, int $code)` calls `response()->json($data, $code)` directly — no automatic wrapping. Controllers are responsible for building the response array. The project convention is:

```json
{
    "data": "... (Resource or collection) ..."
}
```

For paginated endpoints, include `pagination` alongside `data`:

```json
{
    "data": ["..."],
    "pagination": { "current_page": 1, "total": 50 }
}
```

Errors use `sendError()`:

```json
{
    "success": false,
    "message": "...",
    "data": null,
    "errors": {}
}
```

## Quick checklist before you finish

- Controller correctly extends `App\Http\Controllers\Api\BaseController` and returns `sendResponse`/`sendError`.
- `index` uses pagination or a sensible limit (do not return the full table for large datasets).
- No N+1 (eager-load relations in the query when the resource needs them).
- Requests use `$request->validated()`.
- Resource uses `whenLoaded()` for relations.
- Follow `laravel-best-practices`: authorize (policies/gates when applicable), do not expose sensitive fields in Resources, avoid query builder/raw SQL with raw user input, and run `vendor/bin/pint --dirty --format agent` after editing PHP files.

---

## Project-specific: List Actions & Ownership (required)

### FormRequest for list endpoints

Every `List*Request` **must** use `ValidatesPaginationQuery` + `ValidatesSortQuery` and reference `ORDERABLE_COLUMNS` from the Action:

```php
use App\Actions\Post\ListPostsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;

class ListPostsRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListPostsAction::ORDERABLE_COLUMNS),
            [ /* domain filters */ ],
        );
    }
}
```

### List\*Action structure

Every `List*Action` **must** declare `ORDERABLE_COLUMNS`, apply `OwnershipFilter`, then `SortInput`, then `PaginationInput`:

```php
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;

class ListPostsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'title', 'status', 'created_at'];

    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Post::query()->with(['featureMedia', 'category']);
        $ownership->applyTo($query); // no-op for admins

        // domain filters...

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'created_at',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}
```

### Ownership Filtering — required on ALL actions

`App\Support\OwnershipFilter\OwnershipFilter` must be applied in every action that reads or mutates data.
Admins bypass the filter automatically.

```php
// List — model has created_by
$ownership = OwnershipFilter::forAuthUser();
$ownership->applyTo($query);

// List — ownership via a related table (no created_by on the model)
$ownership->applyThrough($query, 'site_id', fn(array $ids) =>
    Site::whereIn('created_by', $ids)->select('id')
);

// Update / Delete — throws AuthorizationException (403) if not authorized
OwnershipFilter::forAuthUser()->authorize($record->created_by);

// Assign pattern — guard site + intersect userIds
$ownership = OwnershipFilter::forAuthUser();
$ownership->authorize($site->created_by);
$userIds = array_values(array_intersect($userIds, $ownership->allowedUserIds()));
```

| Method                                                              | Purpose                                    |
| ------------------------------------------------------------------- | ------------------------------------------ |
| `OwnershipFilter::forAuthUser()`                                    | Instantiate for authenticated user         |
| `->applyTo(Builder $query, string $column = 'created_by')`          | List — direct owner column                 |
| `->applyThrough(Builder $query, string $column, Closure $subquery)` | List — owner via related table             |
| `->authorize(?int $ownerId)`                                        | Update/Delete — throws 403 if unauthorized |
| `->allowedUserIds(): array`                                         | Raw array of allowed user IDs              |
