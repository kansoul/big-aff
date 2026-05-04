<?php

namespace App\Actions\File;

use App\Models\File;
use App\Support\OwnerResource\FileResource;
use Illuminate\Database\Eloquent\Collection;

class OptionsFileAction
{
    /**
     * @param  array{alt_text?: string|null}  $data
     */
    public function execute(array $data): Collection
    {
        $query = File::query();

        (new FileResource)->applyTo($query);

        $query->when(isset($data['alt_text']), fn ($q) => $q->where('alt_text', 'like', '%'.$data['alt_text'].'%'));

        return $query->get();
    }
}
