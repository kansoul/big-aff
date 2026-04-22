<?php

namespace App\Actions\Category;

use App\Models\Category;
use App\Support\OwnershipFilter\OwnershipFilter;
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
        OwnershipFilter::forAuthUser()->authorize($category->created_by);

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
