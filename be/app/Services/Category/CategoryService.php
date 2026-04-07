<?php

namespace App\Services\Category;

use App\Actions\Category\CreateCategoryAction;
use App\Actions\Category\DeleteCategoryAction;
use App\Actions\Category\ListCategoriesAction;
use App\Actions\Category\UpdateCategoryAction;
use App\Models\Category;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CategoryService
{
    public function __construct(
        private readonly ListCategoriesAction $listCategoriesAction,
        private readonly CreateCategoryAction $createCategoryAction,
        private readonly UpdateCategoryAction $updateCategoryAction,
        private readonly DeleteCategoryAction $deleteCategoryAction,
    ) {}

    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listCategoriesAction->execute($filters);
    }

    public function create(array $data): Category
    {
        return $this->createCategoryAction->execute($data);
    }

    public function update(Category $category, array $data): Category
    {
        return $this->updateCategoryAction->execute($category, $data);
    }

    public function delete(Category $category): void
    {
        $this->deleteCategoryAction->execute($category);
    }
}
