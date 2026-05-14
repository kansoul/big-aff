<?php

namespace App\Http\Requests\Adx\AccountConversion;

use Illuminate\Foundation\Http\FormRequest;

class ImportAdxAccountConversionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'lines' => ['required', 'string'],
        ];
    }
}
