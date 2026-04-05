<?php

namespace App\Models;

use App\Enums\SiteStatus;
use App\Models\Traits\Relationship\SiteRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Site extends Model
{
    use HasFactory, SiteRelationship, SoftDeletes;

    protected $fillable = [
        'name',
        'url',
        'secret_key',
        'logo_id',
        'favicon_id',
        'settings',
        'description',
        'status',
        'created_by',
        'updated_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'status' => SiteStatus::class,
        ];
    }
}
