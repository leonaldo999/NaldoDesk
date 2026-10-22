<?php

namespace App\Services;

use App\Events\SaleCreated;
use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesService
{
    private const MAX_TOTAL_CENTS = 99_999_999_999_999;

    public function __construct(private readonly InventoryService $inventory) {}

    public function create(User $user, ?int $clientId, array $items): Sale
    {
        $businessId = (int) $user->business_id;

        $sale = DB::transaction(function () use ($user, $businessId, $clientId, $items): Sale {
            if ($clientId !== null) {
                $clientExists = Client::query()
                    ->where('business_id', $businessId)
                    ->where('is_active', true)
                    ->whereKey($clientId)
                    ->exists();

                if (! $clientExists) {
                    throw ValidationException::withMessages([
                        'client_id' => ['El cliente no está disponible en este negocio.'],
                    ]);
                }
            }

            $quantities = collect($items)->mapWithKeys(fn (array $item): array => [
                (int) $item['product_id'] => (int) $item['quantity'],
            ]);
            $productIds = $quantities->keys()->sort()->values();
            $products = Product::query()
                ->where('business_id', $businessId)
                ->whereIn('id', $productIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== $productIds->count()) {
                throw ValidationException::withMessages([
                    'items' => ['Uno o más productos no pertenecen a este negocio.'],
                ]);
            }

            $totalCents = 0;
            $lineData = [];

            foreach ($quantities as $productId => $quantity) {
                /** @var Product $product */
                $product = $products->get($productId);

                if (! $product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => ["El producto {$product->sku} está archivado y no se puede vender."],
                    ]);
                }

                if ($quantity > $product->stock_on_hand) {
                    throw ValidationException::withMessages([
                        'items' => ["No hay existencias suficientes para el producto {$product->sku}."],
                    ]);
                }

                $unitPriceCents = $this->toCents($product->price);
                $lineTotalCents = $unitPriceCents * $quantity;
                if ($lineTotalCents > self::MAX_TOTAL_CENTS - $totalCents) {
                    throw ValidationException::withMessages([
                        'items' => ['El total de la venta supera el máximo permitido.'],
                    ]);
                }

                $totalCents += $lineTotalCents;
                $lineData[] = [
                    'product' => $product,
                    'quantity' => $quantity,
                    'unit_price' => $product->price,
                    'line_total' => $this->fromCents($lineTotalCents),
                ];
            }

            $sale = Sale::create([
                'business_id' => $businessId,
                'user_id' => $user->id,
                'client_id' => $clientId,
                'total' => $this->fromCents($totalCents),
            ]);

            foreach ($lineData as $line) {
                /** @var Product $product */
                $product = $line['product'];

                $sale->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_sku' => $product->sku,
                    'unit_price' => $line['unit_price'],
                    'quantity' => $line['quantity'],
                    'line_total' => $line['line_total'],
                ]);

                $this->inventory->adjust(
                    $businessId,
                    $product->id,
                    $user,
                    'out',
                    $line['quantity'],
                    "Venta #{$sale->id}",
                    $sale->id,
                );
            }

            return $sale->load(['client:id,name', 'user:id,name', 'items']);
        });

        event(new SaleCreated($sale));

        return $sale;
    }

    private function toCents(string $amount): int
    {
        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '00');

        return ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');
    }

    private function fromCents(int $cents): string
    {
        return intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }
}
