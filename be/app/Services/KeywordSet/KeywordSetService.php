<?php

namespace App\Services\KeywordSet;

use App\Actions\KeywordSet\CreateKeywordSetAction;
use App\Actions\KeywordSet\DeleteKeywordSetAction;
use App\Actions\KeywordSet\ListKeywordSetsAction;
use App\Actions\KeywordSet\UpdateKeywordSetAction;
use App\Models\KeywordSet;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class KeywordSetService
{
    public function __construct(
        private readonly ListKeywordSetsAction $listKeywordSetsAction,
        private readonly CreateKeywordSetAction $createKeywordSetAction,
        private readonly UpdateKeywordSetAction $updateKeywordSetAction,
        private readonly DeleteKeywordSetAction $deleteKeywordSetAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listKeywordSetsAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): KeywordSet
    {
        return $this->createKeywordSetAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(KeywordSet $keywordSet, array $data): KeywordSet
    {
        return $this->updateKeywordSetAction->execute($keywordSet, $data);
    }

    public function delete(KeywordSet $keywordSet): void
    {
        $this->deleteKeywordSetAction->execute($keywordSet);
    }
}
