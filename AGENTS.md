# Agent Instructions

> This file is read by Codex, OpenAI agents, and any tool that looks for `AGENTS.md` at the repo root.
> See also: `CLAUDE.md` (Claude Code), `.cursor/rules/` (Cursor), `.github/copilot-instructions.md` (Copilot), `.agents/skills/` (Antigravity).

## Backend — Laravel (`be/`)

### List Actions & Requests pattern

**FormRequest** — always use both traits and merge rules:

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
            [ /* domain-specific filters */ ],
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

`App\Support\OwnershipFilter\OwnershipFilter` must be applied in every action.
Admins bypass the filter automatically (no-op).

```php
// List — direct created_by column
OwnershipFilter::forAuthUser()->applyTo($query);

// List — ownership via related table
$ownership->applyThrough($query, 'site_id', fn(array $ids) =>
    Site::whereIn('created_by', $ids)->select('id')
);

// Update / Delete — throws AuthorizationException (403) if not allowed
OwnershipFilter::forAuthUser()->authorize($record->created_by);
```

### Code style

- After editing PHP files: `cd be && vendor/bin/pint --dirty`
- Models stay thin; logic goes in `app/Models/Traits/*`
- Business logic in `app/Actions/*` only
