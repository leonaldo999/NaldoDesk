<?php

namespace App\Listeners;

use App\Events\SaleCreated;
use App\Services\Realtime\RedisEventPublisher;

final class PublishSaleCreated
{
    public function __construct(private readonly RedisEventPublisher $publisher) {}

    public function handle(SaleCreated $event): void
    {
        $this->publisher->publishSaleCreated($event->sale);
    }
}
