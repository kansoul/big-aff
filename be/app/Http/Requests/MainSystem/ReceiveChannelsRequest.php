<?php

namespace App\Http\Requests\MainSystem;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;

class ReceiveChannelsRequest extends FormRequest
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
            'main_team_id' => ['required', 'integer', 'exists:main_teams,id'],
            'channels' => ['required', 'array'],
            'channels.*.code' => ['required', 'string', 'max:100'],
            'channels.*.name' => ['required', 'string', 'max:255'],
            'channels.*.is_active' => ['nullable', 'boolean'],
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        Log::channel('sync_reports')->warning('[MainSystemSync][Controller] Channel request validation failed before controller', [
            'main_team_id' => $this->input('main_team_id'),
            'has_bearer_token' => filled($this->bearerToken()),
            'channels_count' => is_array($this->input('channels')) ? count($this->input('channels')) : null,
            'errors' => $validator->errors()->toArray(),
            'ip' => $this->ip(),
            'user_agent' => $this->userAgent(),
        ]);

        parent::failedValidation($validator);
    }
}
