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
                'article_view' => $this->conversion?->article_view,
                'rsu_click' => $this->conversion?->rsu_click,
                'search_view' => $this->conversion?->search_view,
                'search_click' => $this->conversion?->search_click,
            ]),
        ];
    }
}
