<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\InventoryMovementController;
use App\Http\Controllers\SaleController;

Route::get('/health', function () {
    try {
        DB::connection()->select('SELECT 1');
    } catch (Throwable) {
        return response()->json([
            'status' => 'error',
            'checks' => [
                'database' => 'unavailable',
            ],
        ], 503);
    }

    return response()->json([
        'status' => 'ok',
        'checks' => [
            'database' => 'ok',
        ],
    ]);
});

Route::prefix('auth')->group(function (): void {
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->middleware('throttle:login');
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', [AuthenticatedSessionController::class, 'show']);
        Route::post('/logout', [AuthenticatedSessionController::class, 'destroy']);
    });
});

Route::middleware(['auth:sanctum', 'business.assigned'])->group(function (): void {
    Route::get('/users', [UserController::class, 'index'])->middleware('role:admin');
    Route::post('/users', [UserController::class, 'store'])->middleware('role:admin');

    Route::apiResource('clients', ClientController::class)->only(['index', 'store', 'show', 'update']);
    Route::apiResource('products', ProductController::class)->only(['index', 'store', 'show', 'update']);
    Route::get('/products/{productId}/inventory-movements', [InventoryMovementController::class, 'index']);
    Route::post('/products/{productId}/inventory-movements', [InventoryMovementController::class, 'store']);
    Route::get('/sales', [SaleController::class, 'index']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{sale}', [SaleController::class, 'show']);
});
