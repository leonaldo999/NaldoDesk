<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Sale;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ReportController extends Controller
{
    private const TIMEZONE = 'America/Lima';

    public function sales(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        $from = CarbonImmutable::createFromFormat('!Y-m-d', $filters['from'], self::TIMEZONE);
        $until = CarbonImmutable::createFromFormat('!Y-m-d', $filters['to'], self::TIMEZONE)->addDay();

        if ($until->greaterThan($from->addDays(366))) {
            throw ValidationException::withMessages(['to' => 'El período máximo es de 366 días.']);
        }

        $summary = Sale::query()
            ->where('business_id', $request->user()->business_id)
            ->where('created_at', '>=', $from->utc())
            ->where('created_at', '<', $until->utc())
            ->selectRaw('COUNT(*) AS sale_count, COALESCE(SUM(total), 0) AS total')
            ->firstOrFail();

        return response()->json(['data' => [
            ...$filters,
            'timezone' => self::TIMEZONE,
            'sale_count' => (int) $summary->sale_count,
            'total' => $summary->total,
        ]]);
    }

    public function lowStock(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'threshold' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $threshold = (int) ($filters['threshold'] ?? 5);
        $products = Product::query()
            ->where('business_id', $request->user()->business_id)
            ->where('is_active', true)
            ->where('stock_on_hand', '<=', $threshold)
            ->orderBy('stock_on_hand')
            ->orderBy('id')
            ->paginate(15, ['id', 'name', 'sku', 'stock_on_hand'])
            ->appends(['threshold' => $threshold]);

        return response()->json(['threshold' => $threshold, ...$products->toArray()]);
    }
}
