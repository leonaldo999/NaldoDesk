<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Services\SalesService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SaleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $sales = Sale::query()
            ->where('business_id', $request->user()->business_id)
            ->with(['client:id,name', 'user:id,name'])
            ->orderByDesc('id')
            ->paginate(min(100, max(1, (int) $request->query('per_page', 15))))
            ->through(fn (Sale $sale): array => $this->saleData($sale));

        return response()->json($sales);
    }

    public function store(Request $request, SalesService $sales): JsonResponse
    {
        $businessId = (int) $request->user()->business_id;
        $validated = $request->validate([
            'client_id' => [
                'sometimes', 'nullable', 'integer',
                Rule::exists('clients', 'id')->where('business_id', $businessId)->where('is_active', true),
            ],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => [
                'required', 'integer', 'distinct',
                Rule::exists('products', 'id')->where('business_id', $businessId)->where('is_active', true),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
        ]);

        $sale = $sales->create(
            $request->user(),
            isset($validated['client_id']) ? (int) $validated['client_id'] : null,
            $validated['items'],
        );

        return response()->json(['data' => $this->saleData($sale, true)], 201);
    }

    public function show(Request $request, string $sale): JsonResponse
    {
        $record = Sale::query()
            ->where('business_id', $request->user()->business_id)
            ->with(['client:id,name', 'user:id,name', 'items'])
            ->findOrFail($sale);

        return response()->json(['data' => $this->saleData($record, true)]);
    }

    private function saleData(Sale $sale, bool $withItems = false): array
    {
        $data = [
            'id' => $sale->id,
            'client' => $sale->client ? ['id' => $sale->client->id, 'name' => $sale->client->name] : null,
            'user' => ['id' => $sale->user->id, 'name' => $sale->user->name],
            'total' => $sale->total,
            'created_at' => $sale->created_at?->toISOString(),
        ];

        if ($withItems) {
            $data['items'] = $sale->items->map(fn ($item): array => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'product_sku' => $item->product_sku,
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
                'line_total' => $item->line_total,
            ])->all();
        }

        return $data;
    }
}
