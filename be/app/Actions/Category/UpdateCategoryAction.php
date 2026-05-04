<?php

namespace App\Actions\Category;

use App\Models\Category;
use App\Support\OwnerResource\CategoryOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateCategoryAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Category $category, array $data): Category
    {
        (new CategoryOwnerResource)->authorize($category);

        $data['updated_by'] = Auth::id();

        return DB::transaction(function () use ($category, $data) {
            $updated = $category->update($data);
            if ($updated) {
                $category->refresh();
            }

            return $category;
        });
    }
}
