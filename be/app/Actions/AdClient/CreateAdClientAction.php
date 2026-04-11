<?php

namespace App\Actions\AdClient;

use App\Models\AdClient;

class CreateAdClientAction
{
    public function execute(array $data): AdClient
    {
        return AdClient::create($data);
    }
}
