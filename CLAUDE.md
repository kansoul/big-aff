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

### Access rules (`forAuthUser()`)

| Role | `allowedUserIds` includes |
|------|--------------------------|
| **Admin** | — (no filter applied, full access) |
| **Manager** | Self + BFS descendants via `user_parent_child` + **all leaders & members** of every team they manage |
| **Leader** | Self + BFS descendants via `user_parent_child` only (children explicitly assigned in `user_parent_child`) |
| **Member** | Self + BFS descendants via `user_parent_child` (typically just self) |

### Choosing the right filter method

The key question is **how the resource is owned**:

| Resource ownership | List method | Mutate method |
|--------------------|-------------|---------------|
| `created_by` set by regular users (posts, sites, ads_links, categories…) | `applyTo($query)` | `authorize($record->created_by)` |
| Assigned via `channel_user` pivot (channels, revenue/chart reports…) | `applyThroughChannel($query)` | — (no single-record guard needed) |
| Assigned via `account_user` pivot (accounts, campaign/insight reports…) | `applyThroughAccount($query)` | `authorizeAccount($account)` |
| Belongs to a team via `team_id` (business_centers…) | `applyThroughTeam($query)` | `authorizeBusinessCenter($bc)` |
| Team management operations | — | `authorizeTeamManagement($team)` |
| Custom relation | `applyThrough($query, $col, $closure)` | manual check |

> **Do NOT use `applyTo(created_by)` for admin-created resources** (channels, accounts, teams, business centers, campaigns). Those have `created_by = admin_id` which is never in a non-admin's `allowedUserIds`, returning an empty result.

### List actions

```php
$ownership = OwnershipFilter::forAuthUser();
$query = Model::query();

// User-created resources (posts, sites, ads_links, categories, etc.)
$ownership->applyTo($query);                          // WHERE created_by IN (...)

// Channel-based resources (revenue reports, channel list, etc.)
$ownership->applyThroughChannel($query);              // WHERE channel_code IN (subquery)
$ownership->applyThroughChannel($query, 'code');      // custom column

// Account-based resources (accounts, campaign/insight reports, etc.)
$ownership->applyThroughAccount($query);              // WHERE account_id IN (subquery)
$ownership->applyThroughAccount($query, 'account_id');

// Team-scoped resources (business centers, etc.)
$ownership->applyThroughTeam($query);                 // WHERE team_id IN (subquery)

// Custom relation (e.g. follows → sites.created_by)
$ownership->applyThrough($query, 'site_id', fn(array $ids) =>
    Site::whereIn('created_by', $ids)->select('id')
);
```

### Update / Delete actions

```php
// User-created resources — guard by created_by
OwnershipFilter::forAuthUser()->authorize($record->created_by);

// Account — guard via account_user pivot
OwnershipFilter::forAuthUser()->authorizeAccount($account);

// BusinessCenter — guard via team_id
OwnershipFilter::forAuthUser()->authorizeBusinessCenter($businessCenter);

// Team management (assign members, update, delete) — manager OR leader of that team
$ownership = OwnershipFilter::forAuthUser();
$ownership->authorizeTeamManagement($team);
```

### AssignTeam / AssignSite pattern — intersect user IDs

When the action applies to a list of target users, always intersect with `allowedUserIds()` so that a leader cannot act on users outside their child scope:

```php
$ownership = OwnershipFilter::forAuthUser();
$ownership->authorizeTeamManagement($team); // or authorize($site->created_by)

$userIds = $ownership->isAdmin()
    ? $data['user_ids']
    : array_values(array_intersect($data['user_ids'], $ownership->allowedUserIds()));
```

### OwnershipFilter API summary

| Method | Use case |
|--------|----------|
| `OwnershipFilter::forAuthUser()` | Instantiate for the current auth user |
| `->applyTo(Builder $query, string $column = 'created_by')` | List — direct `created_by` column |
| `->applyThrough(Builder $query, string $column, Closure $subquery)` | List — custom relation |
| `->applyThroughChannel(Builder $query, string $column = 'channel_code')` | List — via `channel_user` pivot |
| `->applyThroughAccount(Builder $query, string $column = 'account_id')` | List — via `account_user` pivot |
| `->applyThroughTeam(Builder $query, string $column = 'team_id')` | List — via `team_user` membership |
| `->authorize(?int $ownerId)` | Mutate — guard by `created_by` value |
| `->authorizeAccount(Account $account)` | Mutate — guard account via `account_user` |
| `->authorizeBusinessCenter(BC $bc)` | Mutate — guard BC via `team_id` |
| `->authorizeTeamManagement(Team $team)` | Mutate — guard team ops for manager or leader |
| `->isAdmin(): bool` | Skip non-admin logic when needed |
| `->allowedUserIds(): array` | Raw ID list (non-admin only, guard with `isAdmin()` first) |

### Existing examples

- Direct `created_by` filter: `ListPostsAction`, `ListSitesAction`, `ListCategoriesAction`, `ListAdsLinksAction`
- Channel filter: `ListChannelsAction`, `ListRevenueReportsAction`, `ListRevenueChartReportsAction`
- Account filter: `ListAccountsAction`, `ListCampaignReportsAction`, `GetAdsDeliveryEntitiesAction`
- Team filter: `ListBusinessCentersAction`, `GetBusinessCenterOptionsAction`, `GetTeamOptionsAction`
- Mutation guard (created_by): `UpdatePostAction`, `DeletePostAction`, `UpdateSiteAction`, `DeleteSiteAction`
- Mutation guard (account): `UpdateAccountAction`, `DeleteAccountAction`
- Mutation guard (BC): `UpdateBusinessCenterAction`, `DeleteBusinessCenterAction`
- Mutation guard (team): `UpdateTeamAction`, `DeleteTeamAction`, `AssignTeamAction`
- Combined (guard + intersect): `AssignSiteAction`, `AssignTeamAction`
