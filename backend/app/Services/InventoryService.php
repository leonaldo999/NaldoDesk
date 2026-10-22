<?php

namespace App\Services;

use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function adjust(int $businessId, int $productId, User $user, string $type, int $quantity, ?string $reason = null, ?int $saleId = null): InventoryMovement
    {
        return DB::transaction(function () use ($businessId, $productId, $user, $type, $quantity, $reason, $saleId): InventoryMovement {
            $product = Product::query()
                ->where('business_id', $businessId)
                ->whereKey($productId)
                ->lockForUpdate()
                ->firstOrFail();

            $before = $product->stock_on_hand;
            if ($type === 'out' && $quantity > $before) {
                throw ValidationException::withMessages([
                    'quantity' => ['La salida supera las existencias disponibles.'],
                ]);
            }

            if ($type === 'in' && $quantity > 2147483647 - $before) {
                throw ValidationException::withMessages([
                    'quantity' => ['La entrada supera el máximo de existencias permitido.'],
                ]);
            }

            $after = $type === 'in' ? $before + $quantity : $before - $quantity;
            $product->stock_on_hand = $after;
            $product->save();

            return $product->inventoryMovements()->create([
                'user_id' => $user->id,
                'sale_id' => $saleId,
                'type' => $type,
                'quantity' => $quantity,
                'stock_before' => $before,
                'stock_after' => $after,
                'reason' => $reason,
            ]);
        });
    }
}
