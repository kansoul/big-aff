# GitHub Copilot Instructions

## Tests

- Do not create or modify test files unless the user explicitly requests tests.
- Running relevant existing tests for verification is allowed, but adding tests is not required for implementation tasks.

## Backend — Laravel (`be/`)

### List Actions & Requests

Every list endpoint requires both a FormRequest and an Action class following these conventions.

**FormRequest** — use `ValidatesPaginationQuery` + `ValidatesSortQuery` traits:

```php
use App\Actions\Post\ListPostsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;

class ListPostsRequest extends FormRequest
{
    use ValidatesPaginationQuery, ValidatesSortQuery;

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

**Action class** — `ORDERABLE_COLUMNS` + `OwnershipFilter` + `SortInput` + `PaginationInput`:

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

        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS,
            defaultColumn: 'created_at', defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}
```

### Ownership Filtering — required on ALL actions

Use `App\Support\OwnershipFilter\OwnershipFilter` in every action that reads or mutates data.
Admins bypass the filter automatically.

```php
// List — model has created_by
$ownership = OwnershipFilter::forAuthUser();
$ownership->applyTo($query);

// List — ownership is via a related table
$ownership->applyThrough($query, 'site_id', fn(array $ids) =>
    Site::whereIn('created_by', $ids)->select('id')
);

// Update / Delete — throws 403 if not authorized
OwnershipFilter::forAuthUser()->authorize($record->created_by);
```

### Code style

- After editing any PHP file run: `vendor/bin/pint --dirty`
- Keep models thin; put logic in `app/Models/Traits/*`
- Business logic belongs in `app/Actions/*`
