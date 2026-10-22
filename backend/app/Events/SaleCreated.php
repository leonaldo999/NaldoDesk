<?php

namespace App\Events;

use App\Models\Sale;

final readonly class SaleCreated
{
    public function __construct(public Sale $sale) {}
}
