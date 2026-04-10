<?php

namespace App\Http\Requests\BusinessCenter;

use App\Enums\AdsType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBusinessCenterRequest extends FormRequest
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
            'bc_id' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'ads_type' => ['required', 'string', Rule::in(AdsType::values())],
            'team_id' => ['nullable', 'integer', 'exists:teams,id'],
        ];
    }
}
