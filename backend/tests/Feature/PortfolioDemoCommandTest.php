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

class PortfolioDemoCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_command_is_repeatable_without_resetting_stock_or_repeating_movements(): void
    {
        $business = Business::create(['name' => 'Negocio de demostración']);
        $admin = User::create([
            'business_id' => $business->id,
            'name' => 'Administradora',
            'email' => 'admin-demo@example.test',
            'password' => 'secure-test-password',
            'role' => UserRole::Admin,
        ]);

        $this->artisan('naldo:seed-demo', ['adminEmail' => $admin->email])->assertExitCode(0);
        $this->assertSame(2, Client::query()->where('business_id', $business->id)->count());
        $this->assertSame(2, Product::query()->where('business_id', $business->id)->count());
        $this->assertSame(2, InventoryMovement::query()->count());

        $product = Product::query()->where('sku', 'NLD-DEMO-CAF-001')->firstOrFail();
        $this->assertSame(24, $product->stock_on_hand);

        $this->artisan('naldo:seed-demo', ['adminEmail' => $admin->email])->assertExitCode(0);

        $this->assertSame(2, Client::query()->where('business_id', $business->id)->count());
        $this->assertSame(2, Product::query()->where('business_id', $business->id)->count());
        $this->assertSame(2, InventoryMovement::query()->count());
        $this->assertSame(24, $product->fresh()->stock_on_hand);
    }

    public function test_demo_command_requires_an_existing_admin_with_a_business(): void
    {
        $business = Business::create(['name' => 'Negocio']);
        User::create([
            'business_id' => $business->id,
            'name' => 'Personal',
            'email' => 'staff-demo@example.test',
            'password' => 'secure-test-password',
            'role' => UserRole::Staff,
        ]);

        $this->artisan('naldo:seed-demo', ['adminEmail' => 'staff-demo@example.test'])
            ->assertExitCode(1);
        $this->assertSame(0, Client::count());
        $this->assertSame(0, Product::count());
    }

    public function test_demo_command_refuses_non_local_environments(): void
    {
        $originalEnvironment = $this->app['env'];
        $this->app['env'] = 'production';

        try {
            $this->artisan('naldo:seed-demo', ['adminEmail' => 'admin@example.test'])
                ->expectsOutputToContain('solo se permite en los entornos local y testing')
                ->assertExitCode(1);
        } finally {
            $this->app['env'] = $originalEnvironment;
        }

        $this->assertSame(0, Client::count());
        $this->assertSame(0, Product::count());
    }
}
