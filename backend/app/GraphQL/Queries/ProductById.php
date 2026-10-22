<?php

namespace App\GraphQL\Queries;

use App\Models\Product;

final class ProductById extends BusinessQuery
{
    public function __invoke(mixed $root, array $args): ?Product
    {
        return Product::query()
            ->where('business_id', $this->businessId())
            ->find($args['id']);
    }
}
