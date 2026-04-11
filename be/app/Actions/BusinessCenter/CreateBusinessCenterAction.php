<?php

namespace App\Actions\BusinessCenter;

use App\Models\BusinessCenter;
use Illuminate\Support\Facades\Auth;

class CreateBusinessCenterAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): BusinessCenter
    {
        $data['created_by'] = Auth::id();

        return BusinessCenter::create($data);
    }
}
