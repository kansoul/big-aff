<?php

namespace App\Actions\AdClient;

use App\Models\AdClient;

class UpdateAdClientAction
{
    public function execute(AdClient $adClient, array $data): AdClient
    {
        $adClient->update($data);

        return $adClient->refresh();
    }
}
