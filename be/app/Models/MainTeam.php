<?php

namespace App\Models;

use App\Models\Traits\Relationship\MainTeamRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MainTeam extends Model
{
    use HasFactory, MainTeamRelationship;

    protected $fillable = [
        'name',
        'description',
        'token',
        'sync_campaign_reports',
    ];

    protected function casts(): array
    {
        return [
            'sync_campaign_reports' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (MainTeam $mainTeam): void {
            if (blank($mainTeam->token)) {
                $mainTeam->token = Str::random(64);
            }
        });
    }
}
