<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Sale;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    private const TIMEZONE = 'America/Lima';

    public function sales(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->salesSummary($request)]);
    }

    public function salesCsv(Request $request): StreamedResponse
    {
        $summary = $this->salesSummary($request);

        return $this->csv('ventas.csv', ['Desde', 'Hasta', 'Zona horaria', 'Ventas', 'Importe total'], [$summary]);
    }

    private function salesSummary(Request $request): array
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

        return [
            ...$filters,
            'timezone' => self::TIMEZONE,
            'sale_count' => (int) $summary->sale_count,
            'total' => $summary->total,
        ];
    }

    public function lowStock(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'threshold' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $threshold = (int) ($filters['threshold'] ?? 5);
        $products = $this->stockQuery($request, $threshold)
            ->paginate(15)
            ->appends(['threshold' => $threshold]);

        return response()->json(['threshold' => $threshold, ...$products->toArray()]);
    }

    public function lowStockCsv(Request $request): StreamedResponse
    {
        $filters = $request->validate([
            'threshold' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
        ]);
        $threshold = (int) ($filters['threshold'] ?? 5);
        $rows = $this->stockQuery($request, $threshold)->lazy(500)->map(fn (Product $product) => [
            $this->safeCell($product->name),
            $this->safeCell($product->sku),
            $product->stock_on_hand,
            $threshold,
        ]);

        return $this->csv('stock-bajo.csv', ['Producto', 'SKU', 'Unidades', 'Umbral'], $rows);
    }

    private function stockQuery(Request $request, int $threshold): Builder
    {
        return Product::query()
            ->select(['id', 'name', 'sku', 'stock_on_hand'])
            ->where('business_id', $request->user()->business_id)
            ->where('is_active', true)
            ->where('stock_on_hand', '<=', $threshold)
            ->orderBy('stock_on_hand')
            ->orderBy('id');
    }

    private function safeCell(string $value): string
    {
        return preg_match('/^(?:[\t\r\n]|[\s\p{Cf}]*[=+\-@＝＋－＠])/u', $value) === 1 ? "'".$value : $value;
    }

    private function csv(string $name, array $headers, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows): void {
            $output = fopen('php://output', 'wb');
            fwrite($output, "\xEF\xBB\xBF");
            fputcsv($output, $headers, ',', '"', '', "\r\n");

            foreach ($rows as $row) {
                fputcsv($output, $row, ',', '"', '', "\r\n");
            }

            fclose($output);
        }, $name, ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'private, no-store']);
    }
}
