<?php

namespace App\GraphQL\Queries;

use App\Models\Client;

final class ClientById extends BusinessQuery
{
    public function __invoke(mixed $root, array $args): ?Client
    {
        return Client::query()
            ->where('business_id', $this->businessId())
            ->find($args['id']);
    }
}
