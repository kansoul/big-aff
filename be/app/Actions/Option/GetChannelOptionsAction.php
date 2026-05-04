<?php

namespace App\Actions\Option;

use App\Models\Channel;
use App\Support\OwnerResource\ChannelOwnerResource;
use Illuminate\Support\Collection;

class GetChannelOptionsAction
{
    /**
     * @return Collection<int, array{code: string, name: string}>
     */
    public function execute(): Collection
    {
        $query = Channel::query()
            ->select(['id', 'code', 'name'])
            ->where('is_active', true)
            ->orderBy('name');

        (new ChannelOwnerResource)->applyTo($query);

        return $query->get()->map(fn (Channel $channel) => [
            'code' => $channel->code,
            'name' => $channel->name,
        ]);
    }
}
