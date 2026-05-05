<?php

namespace App\Actions\User;

use App\Actions\Auth\InvalidateUserRemoteSessionsAction;
use App\Enums\TeamRole;
use App\Models\TeamUser;
use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;

class UpdateUserAction
{
    public function __construct(
        private readonly InvalidateUserRemoteSessionsAction $invalidateUserRemoteSessions,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     *
     * @throws AuthorizationException
     */
    public function execute(User $user, array $data): User
    {
        /** @var User $auth */
        $auth = Auth::user();

        if (! $auth->canManageUser($user) && (int) $user->created_by !== (int) $auth->id) {
            throw new AuthorizationException;
        }

        if (array_key_exists('password', $data) && ($data['password'] === null || $data['password'] === '')) {
            unset($data['password']);
        }

        $passwordChanging = array_key_exists('password', $data)
            && is_string($data['password'])
            && $data['password'] !== '';

        if (array_key_exists('parent_id', $data)) {
            $parentId = $data['parent_id'];
            unset($data['parent_id']);

            // Only remove non-team-leader parent links so that team assignments are preserved.
            $leaderIds = TeamUser::query()
                ->where('team_role', TeamRole::LEADER->value)
                ->pluck('user_id');

            UserParentChild::query()
                ->where('child_user_id', $user->id)
                ->whereNotIn('parent_user_id', $leaderIds)
                ->delete();

            if ($parentId !== null && $parentId !== '') {
                UserParentChild::query()->firstOrCreate([
                    'parent_user_id' => (int) $parentId,
                    'child_user_id' => $user->id,
                ]);
            }
        }

        if ($data !== []) {
            $user->update(array_merge($data, [
                'updated_by' => $auth->id,
            ]));
        }

        if ($passwordChanging) {
            $exceptSessionId = null;
            if ((int) $auth->id === (int) $user->id && request()->hasSession()) {
                $exceptSessionId = request()->session()->getId();
            }

            $this->invalidateUserRemoteSessions->execute($user->fresh(), $exceptSessionId);
        }

        $user->load(['role', 'style', 'assignedParentLink.parentUser']);

        return $user->fresh();
    }
}
