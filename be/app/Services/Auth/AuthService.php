<?php

namespace App\Services\Auth;

use App\Actions\Auth\LoginAction;
use App\Actions\Auth\LogoutAction;
use App\Enums\Auth\AuthStatus;
use App\Exceptions\AuthenticationException;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class AuthService
{
    public function __construct(
        private readonly LoginAction $loginAction,
        private readonly LogoutAction $logoutAction
    ) {}

    /**
     * @param  array{email: string, password: string, remember?: bool}  $credentials
     * @return array{status: AuthStatus, user: User|null, message: string|null}
     */
    public function login(array $credentials): array
    {
        try {
            $remember = (bool) ($credentials['remember'] ?? false);
            $user = $this->loginAction->execute($credentials, $remember);

            return [
                'status' => AuthStatus::SUCCESS,
                'user' => $user,
                'message' => null,
            ];
        } catch (AuthenticationException $e) {
            return [
                'status' => AuthStatus::INVALID_CREDENTIALS,
                'user' => null,
                'message' => $e->getMessage(),
            ];
        } catch (\Exception $e) {
            Log::error('Unexpected error during login: '.$e->getMessage());

            return [
                'status' => AuthStatus::FAILED,
                'user' => null,
                'message' => 'An unexpected error occurred.',
            ];
        }
    }

    public function logout(): array
    {
        try {
            $this->logoutAction->execute();

            return [
                'status' => AuthStatus::LOGGED_OUT,
                'message' => 'Logged out successfully.',
            ];
        } catch (\Exception $e) {
            Log::error('Unexpected error during logout: '.$e->getMessage());

            return [
                'status' => AuthStatus::FAILED,
                'message' => 'An unexpected error occurred during logout.',
            ];
        }
    }
}
