<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\Client;
use App\Models\Product;
use App\Models\User;
use App\Services\InventoryService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SeedPortfolioDemo extends Command
{
    protected $signature = 'naldo:seed-demo {adminEmail? : Correo del administrador asociado al negocio}';

    protected $description = 'Carga datos ficticios para la demostración local de NaldoDesk';

    public function handle(InventoryService $inventory): int
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->components->error('La carga de demostración solo se permite en los entornos local y testing.');

            return self::FAILURE;
        }

        $email = $this->argument('adminEmail') ?: $this->ask('Correo del administrador del negocio');
        if (! is_string($email) || trim($email) === '') {
            $this->components->error('El correo del administrador es obligatorio.');

            return self::FAILURE;
        }

        $admin = User::query()->where('email', trim($email))->first();
        if (! $admin || $admin->role !== UserRole::Admin || $admin->business_id === null) {
            $this->components->error('Se requiere un administrador existente, asociado a un negocio.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($admin, $inventory): void {
            $businessId = (int) $admin->business_id;

            foreach ([
                [
                    'email' => 'cliente-demo-aurora@example.test',
                    'name' => 'Café Aurora (demo)',
                    'notes' => 'Registro ficticio de demostración NaldoDesk.',
                ],
                [
                    'email' => 'cliente-demo-horizonte@example.test',
                    'name' => 'Panadería Horizonte (demo)',
                    'notes' => 'Registro ficticio de demostración NaldoDesk.',
                ],
            ] as $clientData) {
                Client::query()->updateOrCreate(
                    ['business_id' => $businessId, 'email' => $clientData['email']],
                    $clientData + ['is_active' => true],
                );
            }

            foreach ([
                ['sku' => 'NLD-DEMO-CAF-001', 'name' => 'Café molido (demo)', 'description' => 'Bolsa de café ficticia para la demo.', 'price' => '12.50', 'opening_stock' => 24],
                ['sku' => 'NLD-DEMO-TAZ-001', 'name' => 'Taza reutilizable (demo)', 'description' => 'Accesorio ficticio para la demo.', 'price' => '8.00', 'opening_stock' => 18],
            ] as $productData) {
                $product = Product::query()->firstOrNew([
                    'business_id' => $businessId,
                    'sku' => $productData['sku'],
                ]);
                $isNew = ! $product->exists;
                $product->fill([
                    'name' => $productData['name'],
                    'description' => $productData['description'],
                    'price' => $productData['price'],
                    'is_active' => true,
                ]);

                if ($isNew) {
                    $product->stock_on_hand = 0;
                }

                $product->save();

                if ($isNew) {
                    $inventory->adjust(
                        $businessId,
                        (int) $product->id,
                        $admin,
                        'in',
                        $productData['opening_stock'],
                        'Existencias iniciales de demostración local.',
                    );
                }
            }
        });

        $this->components->info('Datos ficticios de clientes y productos listos. Las existencias iniciales se registraron una sola vez.');
        $this->line('Crea una venta desde POST /api/sales para recorrer el flujo transaccional completo.');

        return self::SUCCESS;
    }
}
