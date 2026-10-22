<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\Business;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CreateBusiness extends Command
{
    protected $signature = 'naldo:create-business {email? : Correo del administrador que se asociará al negocio}';

    protected $description = 'Crea un negocio y asocia una cuenta administradora existente';

    public function handle(): int
    {
        $email = $this->argument('email') ?: $this->ask('Correo del administrador');
        if (! is_string($email) || trim($email) === '') {
            $this->components->error('El correo del administrador es obligatorio.');

            return self::FAILURE;
        }
        $admin = User::query()->where('email', $email)->first();

        if (! $admin || $admin->role !== UserRole::Admin) {
            $this->components->error('No se encontró una cuenta administradora con ese correo.');

            return self::FAILURE;
        }

        if ($admin->business_id !== null) {
            $this->components->error('Esta cuenta ya está asociada a un negocio.');

            return self::FAILURE;
        }

        $name = $this->ask('Nombre del negocio');
        if (! is_string($name) || trim($name) === '' || mb_strlen($name) > 160) {
            $this->components->error('El nombre es obligatorio y debe tener como máximo 160 caracteres.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($admin, $name): void {
            $business = Business::create(['name' => trim($name)]);
            $admin->business()->associate($business);
            $admin->save();
        });

        $this->components->info('Negocio creado y administrador asociado correctamente.');

        return self::SUCCESS;
    }
}
