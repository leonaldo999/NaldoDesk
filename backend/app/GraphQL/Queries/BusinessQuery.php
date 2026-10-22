<?php

namespace App\GraphQL\Queries;

abstract class BusinessQuery
{
    protected function businessId(): int
    {
        return (int) auth('sanctum')->user()->business_id;
    }
}
