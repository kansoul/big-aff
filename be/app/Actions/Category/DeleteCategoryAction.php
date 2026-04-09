<?php

namespace App\Actions\Category;

use App\Models\Category;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteCategoryAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Category $category): void
    {
        OwnershipFilter::forAuthUser()->authorize($category->created_by);

        $category->delete();
    }
}
