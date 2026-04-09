<?php

namespace App\Services\AdsLink;

use App\Actions\AdsLink\CreateAdsLinkAction;
use App\Actions\AdsLink\ListAdsLinksAction;
use App\Actions\AdsLink\ToggleHideAdsLinkAction;
use App\Actions\AdsLink\UpdateAdsLinkAction;
use App\Models\AdsLink;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AdsLinkService
{
    public function __construct(
        private readonly CreateAdsLinkAction $createAdsLinkAction,
        private readonly UpdateAdsLinkAction $updateAdsLinkAction,
        private readonly ListAdsLinksAction $listAdsLinksAction,
        private readonly ToggleHideAdsLinkAction $toggleHideAdsLinkAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listAdsLinksAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): AdsLink
    {
        return $this->createAdsLinkAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(AdsLink $adsLink, array $data): AdsLink
    {
        return $this->updateAdsLinkAction->execute($adsLink, $data);
    }

    public function toggleHide(AdsLink $adsLink): AdsLink
    {
        return $this->toggleHideAdsLinkAction->execute($adsLink);
    }
}
