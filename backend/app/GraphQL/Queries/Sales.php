<?php

namespace App\GraphQL\Queries;

use App\Models\Sale;
use Illuminate\Database\Eloquent\Builder;

final class Sales extends BusinessQuery
{
    public function __invoke(mixed $root, array $args): Builder
    {
        return Sale::query()
            ->where('business_id', $this->businessId())
            ->orderByDesc('id');
    }
}
