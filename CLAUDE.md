# Project Conventions

## List Actions & Requests Pattern

All list endpoints follow a consistent three-part pattern across both the FormRequest and the Action class.

### FormRequest

Every `List*Request` must:
1. Use both `ValidatesPaginationQuery` and `ValidatesSortQuery` traits
2. Merge `paginationRules()` and `sortRules(Action::ORDERABLE_COLUMNS)` with domain-specific rules
3. Reference the ORDERABLE_COLUMNS constant from the corresponding Action

```php
use App\Actions\Post\ListPostsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListPostsRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListPostsAction::ORDERABLE_COLUMNS),
            [
                // domain-specific filters...
            ],
        );
    }
}
```

### Action class

Every `List*Action` must:
1. Declare `ORDERABLE_COLUMNS` as a `public const array`
2. Apply `OwnershipFilter` (see section below) immediately after building the base query
3. Apply `SortInput::fromValidatedArray()` before pagination
4. Apply `PaginationInput::fromValidatedArray()` to paginate

```php
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;

class ListPostsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'title', 'created_at'];

    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Post::query()->with([...]);
        $ownership->applyTo($query);

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

---

## Ownership Filtering in Actions

All Action classes under `app/Actions/` that read or mutate data **must** apply ownership filtering using `App\Support\OwnershipFilter\OwnershipFilter`.

This ensures a user can only access or modify records that belong to themselves or their child users (via `user_parent_child`). Admins are automatically exempt — the filter is a no-op for them.

### Rules

**List actions** — always apply `applyTo()` before any other filter:

```php
$ownership = OwnershipFilter::forAuthUser();
$query = Model::query();
$ownership->applyTo($query); // filters by created_by
```

If the model has no `created_by` but links to an owner through a related table (e.g. `site_id → sites.created_by`), use `applyThrough()` instead:

```php
$ownership->applyThrough($query, 'site_id', fn(array $ids) =>
    Site::whereIn('created_by', $ids)->select('id')
);
```

**Update and Delete actions** — always call `authorize()` at the top of `execute()`:

```php
OwnershipFilter::forAuthUser()->authorize($record->created_by);
```

This throws `Illuminate\Auth\Access\AuthorizationException` (HTTP 403) if the record is not accessible.

**AssignSiteAction pattern** — when filtering a list of user IDs being acted upon, intersect with `allowedUserIds()`:

```php
$ownership = OwnershipFilter::forAuthUser();
$ownership->authorize($site->created_by);
$userIds = array_values(array_intersect($userIds, $ownership->allowedUserIds()));
```

### OwnershipFilter API summary

| Method | Use case |
|--------|----------|
| `OwnershipFilter::forAuthUser()` | Instantiate for the current auth user |
| `->applyTo(Builder $query, string $column = 'created_by')` | List — direct owner column |
| `->applyThrough(Builder $query, string $column, Closure $subquery)` | List — owner via related table |
| `->authorize(?int $ownerId)` | Update / Delete — throws 403 if unauthorized |
| `->allowedUserIds(): array` | When you need the raw ID list |

### Existing examples

- Direct `created_by` filter: `ListPostsAction`, `ListSitesAction`, `ListCategoriesAction`
- Related table filter: `ListFollowsAction` (follows → sites.created_by)
- Mutation guard: `UpdatePostAction`, `DeletePostAction`, `UpdateSiteAction`, `DeleteSiteAction`, `UpdateCategoryAction`, `DeleteCategoryAction`
- Combined (guard + intersect): `AssignSiteAction`
