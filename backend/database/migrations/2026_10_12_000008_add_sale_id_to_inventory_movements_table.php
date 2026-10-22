<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table): void {
            $table->foreignId('sale_id')->nullable()->after('product_id')->constrained()->restrictOnDelete();
            $table->index(['sale_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table): void {
            $table->dropIndex(['sale_id', 'id']);
            $table->dropConstrainedForeignId('sale_id');
        });
    }
};
