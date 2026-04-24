<?php

namespace App\Actions\User;

use App\Actions\Auth\InvalidateUserRemoteSessionsAction;
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

        if (! $auth->canManageUser($user)) {
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

            UserParentChild::query()->where('child_user_id', $user->id)->delete();

            if ($parentId !== null && $parentId !== '') {
                UserParentChild::query()->create([
                    'parent_user_id' => (int) $parentId,
                    'child_user_id' => $user->id,
                ]);
            }
        }

        if ($data !== []) {
            $user->update($data);
        }

        if ($passwordChanging) {
            $exceptSessionId = null;
            if ((int) $auth->id === (int) $user->id && request()->hasSession()) {
                $exceptSessionId = request()->session()->getId();
            }

            $this->invalidateUserRemoteSessions->execute($user->fresh(), $exceptSessionId);
        }

        $user->load(['role', 'assignedParentLink.parentUser']);

        return $user->fresh();
    }
}
