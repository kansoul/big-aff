<?php

namespace App\Services\Pixel;

use App\Actions\Pixel\CreatePixelAction;
use App\Actions\Pixel\DeletePixelAction;
use App\Actions\Pixel\ListPixelsAction;
use App\Actions\Pixel\UpdatePixelAction;
use App\Models\Pixel;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PixelService
{
    public function __construct(private readonly ListPixelsAction $list, private readonly CreatePixelAction $create, private readonly UpdatePixelAction $update, private readonly DeletePixelAction $delete) {}

    public function list(array $filters): LengthAwarePaginator
    {
        return $this->list->execute($filters);
    }

    public function create(array $data): Pixel
    {
        return $this->create->execute($data);
    }

    public function update(Pixel $pixel, array $data): Pixel
    {
        return $this->update->execute($pixel, $data);
    }

    public function delete(Pixel $pixel): void
    {
        $this->delete->execute($pixel);
    }
}
