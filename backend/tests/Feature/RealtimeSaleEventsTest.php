<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Business;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class RealtimeSaleEventsTest extends TestCase
{
    use RefreshDatabase;

    public function test_sale_publishes_a_minimal_business_scoped_event_after_creation(): void
    {
        config(['realtime.enabled' => true]);
        [$user, $product] = $this->businessUserAndProduct();

        Redis::shouldReceive('publish')
            ->once()
            ->with('naldo:events', Mockery::on(function (string $rawMessage) use ($user): bool {
                $message = json_decode($rawMessage, true, flags: JSON_THROW_ON_ERROR);

                return $message['event'] === 'sale.created'
                    && $message['business_id'] === $user->business_id
                    && is_int($message['payload']['id'])
                    && $message['payload']['total'] === '10.00'
                    && is_string($message['payload']['created_at']);
            }))
            ->andReturn(1);

        $this->actingAs($user)->postJson('/api/sales', [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ])->assertCreated()->assertJsonPath('data.total', '10.00');

        $this->assertDatabaseCount('sales', 1);
    }

    public function test_redis_failure_does_not_fail_or_roll_back_a_sale(): void
    {
        config(['realtime.enabled' => true]);
        [$user, $product] = $this->businessUserAndProduct();

        Redis::shouldReceive('publish')
            ->once()
            ->andThrow(new RuntimeException('Redis is unavailable.'));

        $this->actingAs($user)->postJson('/api/sales', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated();

        $this->assertDatabaseCount('sales', 1);
        $this->assertSame(4, $product->fresh()->stock_on_hand);
    }

    private function businessUserAndProduct(): array
    {
        $business = Business::create(['name' => 'Negocio de prueba']);
        $user = User::create([
            'business_id' => $business->id,
            'name' => 'Usuario de prueba',
            'email' => 'realtime@example.test',
            'password' => 'a-long-test-password',
            'role' => UserRole::Staff,
        ]);
        $product = Product::create([
            'business_id' => $business->id,
            'sku' => 'LIVE-1',
            'name' => 'Producto en tiempo real',
            'price' => '5.00',
            'stock_on_hand' => 5,
            'is_active' => true,
        ]);

        return [$user, $product];
    }
}
