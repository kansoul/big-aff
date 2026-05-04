<?php

namespace App\Actions\Category;

use App\Models\Category;
use App\Support\OwnerResource\CategoryOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteCategoryAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Category $category): void
    {
        (new CategoryOwnerResource)->authorize($category);

        $category->delete();
    }
}
