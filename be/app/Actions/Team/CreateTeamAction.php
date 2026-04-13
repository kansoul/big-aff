<?php

namespace App\Actions\Team;

use App\Models\Team;
use Illuminate\Support\Facades\Auth;

class CreateTeamAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): Team
    {
        $data['created_by'] = Auth::id();

        return Team::create($data)->load('users');
    }
}
