<?php

namespace App\Http\Resources;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Account
 */
class GoogleConversionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'account_id' => $this->account_id,
            'account_name' => $this->account_name,
            'conversion' => $this->whenLoaded('conversion', fn () => [
                'page_view' => $this->conversion?->page_view,
                'redirect' => $this->conversion?->redirect,
                'submit_form' => $this->conversion?->submit_form,
            ]),
        ];
    }
}
