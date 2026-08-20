<?php

namespace App\Models;

use App\Enums\LinkStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Link extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'url', 'tracking_code', 'status'];

    protected $attributes = ['status' => LinkStatus::ACTIVE->value];

    protected function casts(): array
    {
        return ['status' => LinkStatus::class];
    }
}
