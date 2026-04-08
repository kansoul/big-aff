<?php

namespace App\Actions\Category;

use App\Models\Category;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateCategoryAction
{
    public function execute(Category $category, array $data): Category
    {
        $data['updated_by'] = Auth::id();

        return DB::transaction(function () use ($category, $data) {
            $category->update($data);

            return $category->fresh(['featureMedia']);
        });
    }
}
