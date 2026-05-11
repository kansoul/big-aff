<?php

namespace App\Models;

use App\Models\Traits\Relationship\Adx\AdxConversionUploadRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxConversionUpload extends Model
{
    use AdxConversionUploadRelationship, HasFactory;

    protected $fillable = [
        'adx_conversion_id',
        'upload_status',
        'external_conversion_action',
        'request_payload',
        'response_payload',
        'error_code',
        'error_message',
        'uploaded_at',
    ];

    protected function casts(): array
    {
        return [
            'request_payload' => 'array',
            'response_payload' => 'array',
            'uploaded_at' => 'datetime',
        ];
    }
}
