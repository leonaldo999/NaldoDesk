<?php

namespace App\GraphQL\Queries;

use App\Models\Sale;

final class SaleById extends BusinessQuery
{
    public function __invoke(mixed $root, array $args): ?Sale
    {
        return Sale::query()
            ->where('business_id', $this->businessId())
            ->find($args['id']);
    }
}
