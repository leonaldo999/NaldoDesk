<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Business;
use App\Models\Client;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesTest extends TestCase
{
    use RefreshDatabase;

    public function test_sale_uses_catalog_prices_and_records_stock_and_price_snapshots(): void
    {
        $business = Business::create(['name' => 'Tienda']);
        $user = $this->userFor($business, 'cashier@example.test');
        $client = Client::create([
            'business_id' => $business->id,
            'name' => 'Cliente',
            'is_active' => true,
        ]);
        $first = $this->productFor($business, 'SKU-1', '12.34', 10);
        $second = $this->productFor($business, 'SKU-2', '5.00', 4);

        $response = $this->actingAs($user)->postJson('/api/sales', [
            'client_id' => $client->id,
            'total' => '0.01',
            'items' => [
                ['product_id' => $first->id, 'quantity' => 2, 'unit_price' => '0.01'],
                ['product_id' => $second->id, 'quantity' => 1],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.total', '29.68')
            ->assertJsonPath('data.client.name', 'Cliente')
            ->assertJsonPath('data.items.0.unit_price', '12.34')
            ->assertJsonPath('data.items.0.line_total', '24.68');

        $saleId = $response->json('data.id');
        $this->assertSame(8, $first->fresh()->stock_on_hand);
        $this->assertSame(3, $second->fresh()->stock_on_hand);
        $this->assertSame(2, InventoryMovement::query()->where('sale_id', $saleId)->count());
        $this->assertDatabaseHas('inventory_movements', [
            'sale_id' => $saleId,
            'product_id' => $first->id,
            'type' => 'out',
            'quantity' => 2,
            'stock_before' => 10,
            'stock_after' => 8,
        ]);

        $first->update(['price' => '99.99']);
        $this->getJson("/api/sales/{$saleId}")
            ->assertOk()
            ->assertJsonPath('data.items.0.unit_price', '12.34')
            ->assertJsonPath('data.items.0.product_name', $first->name);
    }

    public function test_sale_can_have_no_client_and_isolated_sales_are_not_visible_to_other_businesses(): void
    {
        [$businessA, $businessB] = $this->businesses();
        $userA = $this->userFor($businessA, 'seller-a@example.test');
        $userB = $this->userFor($businessB, 'seller-b@example.test');
        $product = $this->productFor($businessA, 'SKU-A', '7.50', 5);

        $saleId = $this->actingAs($userA)->postJson('/api/sales', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated()->assertJsonPath('data.client', null)->json('data.id');

        $this->actingAs($userB)->getJson('/api/sales')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/sales/{$saleId}")->assertNotFound();
    }

    public function test_sale_rejects_other_business_clients_and_products(): void
    {
        [$businessA, $businessB] = $this->businesses();
        $user = $this->userFor($businessA, 'seller@example.test');
        $otherClient = Client::create([
            'business_id' => $businessB->id,
            'name' => 'Cliente privado',
            'is_active' => true,
        ]);
        $otherProduct = $this->productFor($businessB, 'PRIVATE', '1.00', 4);

        $this->actingAs($user)->postJson('/api/sales', [
            'client_id' => $otherClient->id,
            'items' => [['product_id' => $otherProduct->id, 'quantity' => 1]],
        ])->assertUnprocessable();

        $this->assertSame(0, Sale::count());
    }

    public function test_insufficient_stock_does_not_create_a_partial_sale_or_change_stock(): void
    {
        $business = Business::create(['name' => 'Inventario insuficiente']);
        $user = $this->userFor($business, 'shortage@example.test');
        $first = $this->productFor($business, 'ENOUGH', '2.00', 5);
        $second = $this->productFor($business, 'SHORT', '3.00', 1);

        $this->actingAs($user)->postJson('/api/sales', [
            'items' => [
                ['product_id' => $first->id, 'quantity' => 2],
                ['product_id' => $second->id, 'quantity' => 2],
            ],
        ])->assertUnprocessable();

        $this->assertSame(0, Sale::count());
        $this->assertSame(0, SaleItem::count());
        $this->assertSame(0, InventoryMovement::count());
        $this->assertSame(5, $first->fresh()->stock_on_hand);
        $this->assertSame(1, $second->fresh()->stock_on_hand);
    }

    public function test_guests_and_duplicate_product_lines_are_rejected(): void
    {
        $this->postJson('/api/sales', [
            'items' => [['product_id' => 1, 'quantity' => 1]],
        ])->assertUnauthorized();

        $business = Business::create(['name' => 'Validaciones']);
        $user = $this->userFor($business, 'validation@example.test');
        $product = $this->productFor($business, 'UNIQUE', '1.00', 4);
        $line = ['product_id' => $product->id, 'quantity' => 1];

        $this->actingAs($user)->postJson('/api/sales', ['items' => [$line, $line]])
            ->assertUnprocessable();
        $this->assertSame(0, Sale::count());
    }

    private function businesses(): array
    {
        return [
            Business::create(['name' => 'Negocio A']),
            Business::create(['name' => 'Negocio B']),
        ];
    }

    private function userFor(Business $business, string $email): User
    {
        return User::create([
            'business_id' => $business->id,
            'name' => 'Personal de tienda',
            'email' => $email,
            'password' => 'a-long-test-password',
            'role' => UserRole::Staff,
        ]);
    }

    private function productFor(Business $business, string $sku, string $price, int $stock): Product
    {
        return Product::create([
            'business_id' => $business->id,
            'sku' => $sku,
            'name' => "Producto {$sku}",
            'price' => $price,
            'stock_on_hand' => $stock,
            'is_active' => true,
        ]);
    }
}
