<?php

namespace App\Http\Controllers;

use App\Models\InventoryMovement;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryMovementController extends Controller
{
    public function index(Request $request, string $productId): JsonResponse
    {
        $request->validate(['per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $product = $this->findProduct($request, $productId);
        $movements = $product->inventoryMovements()
            ->with('user:id,name')
            ->orderByDesc('id')
            ->paginate(min(100, max(1, (int) $request->query('per_page', 20))))
            ->through(fn (InventoryMovement $movement): array => $this->movementData($movement));

        return response()->json($movements);
    }

    public function store(Request $request, string $productId, InventoryService $inventory): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:in,out'],
            'quantity' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $movement = $inventory->adjust(
            (int) $request->user()->business_id,
            (int) $productId,
            $request->user(),
            $validated['type'],
            (int) $validated['quantity'],
            $validated['reason'] ?? null,
        );

        return response()->json(['data' => $this->movementData($movement->load('user:id,name'))], 201);
    }

    private function findProduct(Request $request, string $id): Product
    {
        return Product::query()
            ->where('business_id', $request->user()->business_id)
            ->findOrFail($id);
    }

    private function movementData(InventoryMovement $movement): array
    {
        return [
            'id' => $movement->id,
            'product_id' => $movement->product_id,
            'sale_id' => $movement->sale_id,
            'user' => ['id' => $movement->user->id, 'name' => $movement->user->name],
            'type' => $movement->type,
            'quantity' => $movement->quantity,
            'stock_before' => $movement->stock_before,
            'stock_after' => $movement->stock_after,
            'reason' => $movement->reason,
            'created_at' => $movement->created_at?->toISOString(),
        ];
    }
}
