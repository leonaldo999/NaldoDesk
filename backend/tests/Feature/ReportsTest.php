<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_respect_lima_date_boundaries_and_business_scope(): void
    {
        $user = $this->staff('Tienda');
        $other = $this->staff('Otra tienda');
        foreach ([
            [$user, '2026-11-11 04:59:59', '100.00'],
            [$user, '2026-11-11 05:00:00', '12.35'],
            [$user, '2026-11-12 04:59:59', '0.10'],
            [$user, '2026-11-12 05:00:00', '200.00'],
            [$other, '2026-11-11 12:00:00', '300.00'],
        ] as [$owner, $time, $total]) {
            $sale = new Sale(['business_id' => $owner->business_id, 'user_id' => $owner->id, 'total' => $total]);
            $sale->created_at = $time;
            $sale->save();
        }

        $this->actingAs($user)->getJson('/api/reports/sales?from=2026-11-11&to=2026-11-11')
            ->assertOk()->assertJsonPath('data.sale_count', 2)->assertJsonPath('data.total', '12.45')
            ->assertJsonPath('data.timezone', 'America/Lima');

        $this->getJson('/api/reports/sales?from=2026-11-13&to=2026-11-13')
            ->assertOk()->assertJsonPath('data.sale_count', 0)->assertJsonPath('data.total', '0.00');

        $csv = $this->get('/api/reports/sales/csv?from=2026-11-11&to=2026-11-11')
            ->assertOk()->assertDownload('ventas.csv')->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $this->assertStringContainsString("2026-11-11,2026-11-11,America/Lima,2,12.45\r\n", $csv);
    }

    public function test_stock_includes_zero_and_threshold_but_excludes_inactive_and_other_businesses(): void
    {
        $user = $this->staff('Tienda');
        $other = $this->staff('Otra tienda');
        foreach ([
            [$user, 'LIMITE', 5, true],
            [$user, 'AGOTADO', 0, true],
            [$user, 'DISPONIBLE', 6, true],
            [$user, 'ARCHIVO', 0, false],
            [$other, 'AJENO', 1, true],
        ] as [$owner, $sku, $stock, $active]) {
            Product::create([
                'business_id' => $owner->business_id, 'name' => $sku, 'sku' => $sku,
                'price' => '1.00', 'stock_on_hand' => $stock, 'is_active' => $active,
            ]);
        }

        $this->actingAs($user)->getJson('/api/reports/low-stock')
            ->assertOk()->assertJsonPath('threshold', 5)->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.sku', 'AGOTADO')->assertJsonPath('data.1.sku', 'LIMITE');

        $this->getJson('/api/reports/low-stock?threshold=0')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.stock_on_hand', 0);

        for ($i = 0; $i < 16; $i++) {
            Product::create([
                'business_id' => $user->business_id, 'name' => 'Repuesto, edición "A"',
                'sku' => '=TEST'.$i, 'price' => '1.00', 'stock_on_hand' => 0, 'is_active' => true,
            ]);
        }

        $csv = $this->get('/api/reports/low-stock/csv?threshold=0&page=2')
            ->assertOk()->assertDownload('stock-bajo.csv')->streamedContent();
        $this->assertSame(18, substr_count($csv, "\r\n"));
        $this->assertStringContainsString('"Repuesto, edición ""A""",\'=TEST15,0,0', $csv);
        $this->assertStringNotContainsString('AJENO', $csv);
        $this->assertStringNotContainsString('ARCHIVO', $csv);
    }

    public function test_reports_require_a_session_and_validate_filters(): void
    {
        $this->getJson('/api/reports/sales')->assertUnauthorized();
        $this->getJson('/api/reports/low-stock')->assertUnauthorized();
        $this->getJson('/api/reports/sales/csv')->assertUnauthorized();
        $this->getJson('/api/reports/low-stock/csv')->assertUnauthorized();
        $this->actingAs($this->staff('Tienda'));

        $this->getJson('/api/reports/sales?from=2026-11-12&to=2026-11-11')->assertUnprocessable()->assertJsonValidationErrors('to');
        $this->getJson('/api/reports/sales?from=2024-01-01&to=2026-11-11')->assertUnprocessable()->assertJsonValidationErrors('to');
        $this->getJson('/api/reports/low-stock?threshold=-1')->assertUnprocessable()->assertJsonValidationErrors('threshold');
        $this->getJson('/api/reports/low-stock/csv?threshold=-1')->assertUnprocessable()->assertJsonValidationErrors('threshold');
    }

    private function staff(string $business): User
    {
        return User::factory()->create(['business_id' => Business::create(['name' => $business])->id]);
    }
}
