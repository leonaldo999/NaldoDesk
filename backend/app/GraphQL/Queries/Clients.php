<?php

namespace App\GraphQL\Queries;

use App\Models\Client;
use Illuminate\Database\Eloquent\Builder;

final class Clients extends BusinessQuery
{
    public function __invoke(mixed $root, array $args): Builder
    {
        $search = isset($args['search']) ? mb_strtolower($args['search']) : null;

        return Client::query()
            ->where('business_id', $this->businessId())
            ->when($search, fn (Builder $query) => $query->whereRaw('LOWER(name) LIKE ?', ['%'.$search.'%']))
            ->orderBy('name')
            ->orderBy('id');
    }
}
