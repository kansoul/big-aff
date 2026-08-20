<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id', 'website_url', 'email', 'first_name', 'last_name',
        'date_of_birth', 'cell_phone', 'address', 'city', 'state', 'zip',
    ];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date:Y-m-d'];
    }

    public function trackingSession(): BelongsTo
    {
        return $this->belongsTo(TrackingSession::class, 'session_id', 'session_id');
    }
}
