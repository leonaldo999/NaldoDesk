<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // No se crean cuentas con contraseñas conocidas al ejecutar db:seed.
        // El administrador se crea de forma interactiva con naldo:create-admin.
    }
}
