<?php

namespace App\Actions\User;

use App\Models\User;
use App\Services\Storage\StorageServiceInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadAvatarAction
{
    public const AVATAR_DIRECTORY = 'avatar';

    public function __construct(
        private readonly StorageServiceInterface $storageService
    ) {}

    public function execute(User $user, UploadedFile $file): User
    {
        if ($user->avatar) {
            Storage::disk(StorageServiceInterface::PUBLIC_DISK)->delete($user->avatar);
        }

        $fileName = Str::uuid().'.'.$file->getClientOriginalExtension();
        $path = $this->storageService->store($file, self::AVATAR_DIRECTORY, $fileName);

        $user->update(['avatar' => $path]);

        return $user;
    }
}
