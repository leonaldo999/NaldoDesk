<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Business;
use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GraphQLQueriesTest extends TestCase
{
    use RefreshDatabase;

    public function test_graphql_requires_authentication_and_an_assigned_business(): void
    {
        $query = '{ clients(first: 1) { data { id } } }';

        $this->postJson('/graphql', ['query' => $query])->assertUnauthorized();

        $unassigned = User::create([
            'name' => 'Sin negocio',
            'email' => 'graphql-unassigned@example.test',
            'password' => 'a-long-test-password',
            'role' => UserRole::Admin,
        ]);

        $this->actingAs($unassigned)->postJson('/graphql', ['query' => $query])->assertConflict();
    }

    public function test_graphql_search_and_pagination_are_scoped_to_the_current_business(): void
    {
        [$businessA, $businessB] = $this->businesses();
        $userA = $this->userFor($businessA, 'graphql-a@example.test');
        $userB = $this->userFor($businessB, 'graphql-b@example.test');

        $client = Client::create(['business_id' => $businessB->id, 'name' => 'Cliente privado', 'is_active' => true]);
        Client::create(['business_id' => $businessA->id, 'name' => 'Ana Uno', 'is_active' => true]);
        Client::create(['business_id' => $businessA->id, 'name' => 'Ana Dos', 'is_active' => true]);
        Product::create(['business_id' => $businessA->id, 'sku' => 'ANA-1', 'name' => 'Anillo', 'price' => '12.50', 'stock_on_hand' => 4, 'is_active' => true]);
        Product::create(['business_id' => $businessA->id, 'sku' => 'B-2', 'name' => 'Collar', 'price' => '30.00', 'stock_on_hand' => 2, 'is_active' => true]);
        Product::create(['business_id' => $businessB->id, 'sku' => 'PRIVATE', 'name' => 'Producto privado', 'price' => '1.00', 'stock_on_hand' => 1, 'is_active' => true]);

        $clientsQuery = <<<'GRAPHQL'
            query ($search: String!) {
                clients(search: $search, first: 1) {
                    data { id name }
                    paginatorInfo { total currentPage perPage }
                }
                client(id: "%s") { id name }
                products(search: "AN", first: 10) {
                    data { id sku name price stock_on_hand }
                    paginatorInfo { total }
                }
            }
            GRAPHQL;
        $query = sprintf($clientsQuery, $client->id);

        $this->actingAs($userA)->postJson('/graphql', [
            'query' => $query,
            'variables' => ['search' => 'Ana'],
        ])->assertOk()
            ->assertJsonPath('data.clients.paginatorInfo.total', 2)
            ->assertJsonPath('data.clients.paginatorInfo.perPage', 1)
            ->assertJsonPath('data.clients.data.0.name', 'Ana Dos')
            ->assertJsonPath('data.client', null)
            ->assertJsonPath('data.products.paginatorInfo.total', 1)
            ->assertJsonPath('data.products.data.0.sku', 'ANA-1')
            ->assertDontSee('Producto privado');

        $this->actingAs($userB)->postJson('/graphql', [
            'query' => '{ clients(first: 10) { data { name } paginatorInfo { total } } }',
        ])->assertOk()
            ->assertJsonPath('data.clients.paginatorInfo.total', 1)
            ->assertJsonPath('data.clients.data.0.name', 'Cliente privado');
    }

    public function test_graphql_sales_query_returns_related_snapshot_data_only_for_its_business(): void
    {
        [$businessA, $businessB] = $this->businesses();
        $userA = $this->userFor($businessA, 'graphql-sales-a@example.test');
        $userB = $this->userFor($businessB, 'graphql-sales-b@example.test');
        $client = Client::create(['business_id' => $businessA->id, 'name' => 'Cliente A', 'is_active' => true]);
        $product = Product::create(['business_id' => $businessA->id, 'sku' => 'SNAP-1', 'name' => 'Producto A', 'price' => '5.50', 'stock_on_hand' => 1, 'is_active' => true]);
        $sale = Sale::create(['business_id' => $businessA->id, 'user_id' => $userA->id, 'client_id' => $client->id, 'total' => '11.00']);
        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'product_name' => 'Producto A snapshot',
            'product_sku' => 'SNAP-1',
            'unit_price' => '5.50',
            'quantity' => 2,
            'line_total' => '11.00',
        ]);
        Sale::create(['business_id' => $businessB->id, 'user_id' => $userB->id, 'total' => '9.00']);

        $query = <<<'GRAPHQL'
            {
                sales(first: 10) {
                    data {
                        id total
                        client { name }
                        user { name }
                        items { product_name product_sku unit_price quantity line_total }
                    }
                    paginatorInfo { total }
                }
                sale(id: "%s") { id total }
            }
            GRAPHQL;

        $this->actingAs($userA)->postJson('/graphql', ['query' => sprintf($query, $sale->id)])
            ->assertOk()
            ->assertJsonPath('data.sales.paginatorInfo.total', 1)
            ->assertJsonPath('data.sales.data.0.client.name', 'Cliente A')
            ->assertJsonPath('data.sales.data.0.user.name', 'Usuario de prueba')
            ->assertJsonPath('data.sales.data.0.items.0.product_name', 'Producto A snapshot')
            ->assertJsonPath('data.sale.total', '11.00');

        $this->actingAs($userB)->postJson('/graphql', [
            'query' => sprintf('{ sale(id: "%s") { id } }', $sale->id),
        ])->assertOk()->assertJsonPath('data.sale', null);
    }

    private function businesses(): array
    {
        return [Business::create(['name' => 'Negocio A']), Business::create(['name' => 'Negocio B'])];
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
