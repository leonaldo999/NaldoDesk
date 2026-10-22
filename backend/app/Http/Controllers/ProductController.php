<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $search = $request->query('search');
        $products = Product::query()
            ->where('business_id', $request->user()->business_id)
            ->when($search, fn ($query) => $query->where(function ($query) use ($search): void {
                $pattern = '%'.mb_strtolower($search).'%';
                $query->whereRaw('LOWER(name) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(sku) LIKE ?', [$pattern]);
            }))
            ->orderBy('name')
            ->paginate(min(100, max(1, (int) $request->query('per_page', 15))))
            ->through(fn (Product $product): array => $this->productData($product));

        return response()->json($products);
    }

    public function store(Request $request, InventoryService $inventory): JsonResponse
    {
        $businessId = (int) $request->user()->business_id;
        $validated = $request->validate([
            'sku' => ['required', 'string', 'max:80', Rule::unique('products', 'sku')->where('business_id', $businessId)],
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'opening_stock' => ['sometimes', 'integer', 'min:0', 'max:2147483647'],
        ]);
        $openingStock = (int) ($validated['opening_stock'] ?? 0);
        unset($validated['opening_stock']);

        $product = DB::transaction(function () use ($validated, $businessId, $openingStock, $request, $inventory): Product {
            $product = Product::create([
                ...$validated,
                'business_id' => $businessId,
                'stock_on_hand' => 0,
                'is_active' => true,
            ]);

            if ($openingStock > 0) {
                $inventory->adjust($businessId, $product->id, $request->user(), 'in', $openingStock, 'Saldo inicial');
                $product->refresh();
            }

            return $product;
        });

        return response()->json(['data' => $this->productData($product)], 201);
    }

    public function show(Request $request, string $product): JsonResponse
    {
        $record = $this->findProduct($request, $product);

        return response()->json(['data' => $this->productData($record)]);
    }

    public function update(Request $request, string $product): JsonResponse
    {
        $record = $this->findProduct($request, $product);
        $businessId = (int) $request->user()->business_id;
        $record->fill($request->validate([
            'sku' => ['sometimes', 'required', 'string', 'max:80', Rule::unique('products', 'sku')->where('business_id', $businessId)->ignore($record->id)],
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'price' => ['sometimes', 'required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'is_active' => ['sometimes', 'boolean'],
        ]));
        $record->save();

        return response()->json(['data' => $this->productData($record)]);
    }

    private function findProduct(Request $request, string $id): Product
    {
        return Product::query()
            ->where('business_id', $request->user()->business_id)
            ->findOrFail($id);
    }

    private function productData(Product $product): array
    {
        return [
            'id' => $product->id,
            'sku' => $product->sku,
            'name' => $product->name,
            'description' => $product->description,
            'price' => $product->price,
            'stock_on_hand' => $product->stock_on_hand,
            'is_active' => $product->is_active,
            'created_at' => $product->created_at?->toISOString(),
            'updated_at' => $product->updated_at?->toISOString(),
        ];
    }
}
