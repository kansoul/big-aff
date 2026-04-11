<?php

namespace App\Actions\AdClient;

use App\Models\AdClient;

class DeleteAdClientAction
{
    public function execute(AdClient $adClient): void
    {
        $adClient->delete();
    }
}
