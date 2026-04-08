<?php

namespace App\Actions\File;

use App\Models\File;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;

class OptionsFileAction
{
    /**
     * @param  array{alt_text?: string|null}  $data
     */
    public function execute(array $data): Collection
    {
        $user = Auth::user();

        return File::query()
            ->visibleToUser($user)
            ->when(isset($data['alt_text']), function ($query) use ($data) {
                $query->where('alt_text', 'like', '%'.$data['alt_text'].'%');
            })
            ->get();
    }
}
