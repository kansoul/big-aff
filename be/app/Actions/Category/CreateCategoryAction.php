<?php

namespace App\Actions\Category;

use App\Models\Category;
use Illuminate\Support\Facades\Auth;

class CreateCategoryAction
{
    public function execute(array $data): Category
    {
        $data['created_by'] = Auth::id();

        return Category::create($data);
    }
}
