<?php

namespace App\Http\Resources\User;

use App\Models\Role;
use App\Models\User;
use App\Support\Accounts\AccountsAccess;
use App\Support\AdsReport\AdsReportAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 *
 * @property int $id
 * @property string $name
 * @property string $email
 * @property-read Role|null $role
 */
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User $user */
        $user = $this->resource;
        $user->loadMissing(['role', 'teams']);
        $roles = $user->teams->pluck('pivot.team_role')->unique()->values()->toArray();
        $permissions = $user->role?->getPermissionSlugs() ?? [];

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar_url' => $this->avatar
                ? rtrim(config('app.url'), '/').'/storage/'.$this->avatar
                : null,
            'permissions' => $permissions,
            'is_admin' => $this->is_admin,
            'is_main_system' => (bool) config('main_system.is_main'),
            'can_view_accounts_unscoped' => AccountsAccess::canViewUnscoped($user),
            'can_view_ads_report_unscoped' => AdsReportAccess::canViewUnscoped($user),
            'roles' => $roles,
        ];
    }
}
