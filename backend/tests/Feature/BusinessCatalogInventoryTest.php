<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Business;
use App\Models\Client;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BusinessCatalogInventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_and_users_without_business_cannot_access_the_catalog(): void
    {
        $this->getJson('/api/clients')->assertUnauthorized();

        $unassigned = User::create([
            'name' => 'Sin negocio',
            'email' => 'unassigned@example.test',
            'password' => 'a-long-test-password',
            'role' => UserRole::Admin,
        ]);

        $this->actingAs($unassigned)->getJson('/api/clients')->assertConflict();
    }

    public function test_business_command_associates_an_existing_admin(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'owner@example.test',
            'password' => 'a-long-test-password',
            'role' => UserRole::Admin,
        ]);

        $this->artisan('naldo:create-business', ['email' => $admin->email])
            ->expectsQuestion('Nombre del negocio', 'Tienda Naldo')
            ->expectsOutputToContain('Negocio creado y administrador asociado correctamente.')
            ->assertExitCode(0);

        $this->assertDatabaseHas('businesses', ['name' => 'Tienda Naldo']);
        $this->assertNotNull($admin->fresh()->business_id);
    }

    public function test_client_records_are_isolated_by_business(): void
    {
        [$businessA, $businessB] = $this->businesses();
        $userA = $this->userFor($businessA, 'client-a@example.test');
        $userB = $this->userFor($businessB, 'client-b@example.test');

        $created = $this->actingAs($userA)->postJson('/api/clients', [
            'name' => 'Cliente A',
            'email' => 'contact@example.test',
        ])->assertCreated()->assertJsonPath('data.name', 'Cliente A');
        $clientId = $created->json('data.id');

        $this->actingAs($userB)->getJson('/api/clients')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/clients/{$clientId}")->assertNotFound();
    }

    public function test_products_support_opening_stock_and_are_isolated_by_business(): void
    {
        [$businessA, $businessB] = $this->businesses();
        $userA = $this->userFor($businessA, 'product-a@example.test');
        $userB = $this->userFor($businessB, 'product-b@example.test');

        $created = $this->actingAs($userA)->postJson('/api/products', [
            'sku' => 'SKU-001',
            'name' => 'Producto A',
            'price' => '10.50',
            'opening_stock' => 8,
            'stock_on_hand' => 500,
        ])->assertCreated()
            ->assertJsonPath('data.stock_on_hand', 8)
            ->assertJsonPath('data.price', '10.50');
        $productId = $created->json('data.id');

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $productId,
            'type' => 'in',
            'quantity' => 8,
            'stock_before' => 0,
            'stock_after' => 8,
        ]);

        $this->actingAs($userB)->getJson('/api/products')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/products/{$productId}")->assertNotFound();
    }

    public function test_inventory_movements_are_audited_and_stock_cannot_go_below_zero(): void
    {
        $business = Business::create(['name' => 'Inventario']);
        $user = $this->userFor($business, 'inventory@example.test');
        $product = Product::create([
            'business_id' => $business->id,
            'sku' => 'STOCK-1',
            'name' => 'Producto',
            'price' => '3.25',
            'stock_on_hand' => 5,
            'is_active' => true,
        ]);

        $this->actingAs($user)->postJson("/api/products/{$product->id}/inventory-movements", [
            'type' => 'out',
            'quantity' => 2,
            'reason' => 'Ajuste',
        ])->assertCreated()->assertJsonPath('data.stock_after', 3);

        $this->postJson("/api/products/{$product->id}/inventory-movements", [
            'type' => 'out',
            'quantity' => 4,
        ])->assertUnprocessable();

        $this->assertSame(3, $product->fresh()->stock_on_hand);
        $this->assertSame(1, InventoryMovement::query()->where('product_id', $product->id)->count());
        $this->getJson("/api/products/{$product->id}/inventory-movements")
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_sku_is_unique_within_a_business_and_can_repeat_in_another(): void
    {
        [$businessA, $businessB] = $this->businesses();
        $userA = $this->userFor($businessA, 'sku-a@example.test');
        $userB = $this->userFor($businessB, 'sku-b@example.test');
        $payload = ['sku' => 'SAME-SKU', 'name' => 'Producto', 'price' => '2.00'];

        $this->actingAs($userA)->postJson('/api/products', $payload)->assertCreated();
        $this->postJson('/api/products', $payload)->assertUnprocessable();
        $this->actingAs($userB)->postJson('/api/products', $payload)->assertCreated();
    }

    public function test_user_management_is_scoped_to_the_admins_business(): void
    {
        [$businessA, $businessB] = $this->businesses();
        $adminA = User::create([
            'business_id' => $businessA->id,
            'name' => 'Admin A',
            'email' => 'admin-a@example.test',
            'password' => 'a-long-test-password',
            'role' => UserRole::Admin,
        ]);
        User::create([
            'business_id' => $businessB->id,
            'name' => 'Admin B',
            'email' => 'admin-b@example.test',
            'password' => 'a-long-test-password',
            'role' => UserRole::Admin,
        ]);

        $this->actingAs($adminA)->getJson('/api/users')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'admin-a@example.test');
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
            'name' => 'Usuario de prueba',
            'email' => $email,
            'password' => 'a-long-test-password',
            'role' => UserRole::Staff,
        ]);
    }
}
