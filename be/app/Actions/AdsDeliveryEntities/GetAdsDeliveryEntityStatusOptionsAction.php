<?php

namespace App\Actions\AdsDeliveryEntities;

use App\Support\AdsDelivery\DeliveryEntityStatusDictionary;

class GetAdsDeliveryEntityStatusOptionsAction
{
    /**
     * @return list<array{value: string, label: string}>
     */
    public function execute(): array
    {
        return DeliveryEntityStatusDictionary::toSelectOptions();
    }
}
