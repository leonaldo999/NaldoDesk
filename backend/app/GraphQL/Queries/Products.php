<?php

namespace App\GraphQL\Queries;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;

final class Products extends BusinessQuery
{
    public function __invoke(mixed $root, array $args): Builder
    {
        $search = isset($args['search']) ? mb_strtolower($args['search']) : null;

        return Product::query()
            ->where('business_id', $this->businessId())
            ->when($search, fn (Builder $query) => $query->where(function (Builder $query) use ($search): void {
                $pattern = '%'.$search.'%';
                $query->whereRaw('LOWER(name) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(sku) LIKE ?', [$pattern]);
            }))
            ->orderBy('name')
            ->orderBy('id');
    }
}
