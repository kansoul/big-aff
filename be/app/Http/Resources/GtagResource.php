<?php

namespace App\Http\Resources;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Account
 */
class GtagResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'account_id' => $this->account_id,
            'account_name' => $this->account_name,
            'gtag' => $this->whenLoaded('gtag', fn () => [
                'code' => $this->gtag?->code,
                'article_view' => $this->gtag?->article_view,
                'rsu_click' => $this->gtag?->rsu_click,
                'search_view' => $this->gtag?->search_view,
                'search_click' => $this->gtag?->search_click,
            ]),
        ];
    }
}
