<?php

namespace App\Services\Realtime;

use App\Models\Sale;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

final class RedisEventPublisher
{
    public function publishSaleCreated(Sale $sale): void
    {
        if (! config('realtime.enabled')) {
            return;
        }

        try {
            Redis::publish(config('realtime.event_channel'), json_encode([
                'event' => 'sale.created',
                'business_id' => (int) $sale->business_id,
                'payload' => [
                    'id' => (int) $sale->id,
                    'total' => (string) $sale->total,
                    'created_at' => $sale->created_at?->toISOString(),
                ],
            ], JSON_THROW_ON_ERROR));
        } catch (Throwable $exception) {
            Log::warning('No se pudo publicar el evento de venta en tiempo real.', [
                'sale_id' => $sale->id,
                'exception' => $exception::class,
            ]);
        }
    }
}
