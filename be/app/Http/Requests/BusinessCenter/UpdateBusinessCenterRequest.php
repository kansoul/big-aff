<?php

namespace App\Http\Requests\BusinessCenter;

use App\Enums\AdsType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBusinessCenterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'bc_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'name' => ['sometimes', 'string', 'max:255'],
            'ads_type' => ['sometimes', 'string', Rule::in(AdsType::values())],
            'team_id' => ['sometimes', 'nullable', 'integer', 'exists:teams,id'],
        ];
    }
}
