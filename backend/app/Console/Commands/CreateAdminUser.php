<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateAdminUser extends Command
{
    protected $signature = 'naldo:create-admin';

    protected $description = 'Crea el primer usuario administrador de NaldoDesk';

    public function handle(): int
    {
        if (User::query()->where('role', UserRole::Admin->value)->exists()) {
            $this->components->error('Ya existe un administrador.');

            return self::FAILURE;
        }

        $name = $this->ask('Nombre del administrador');
        $email = $this->ask('Correo del administrador');
        $password = $this->secret('Contraseña (mínimo 12 caracteres)');
        $confirmation = $this->secret('Confirma la contraseña');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12'],
        ]);

        if ($validator->fails() || ! is_string($confirmation) || ! hash_equals((string) $password, $confirmation)) {
            $this->components->error($validator->errors()->first() ?: 'Las contraseñas no coinciden. No se creó el administrador.');

            return self::FAILURE;
        }

        User::create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'role' => UserRole::Admin,
        ]);

        $this->components->info('Administrador creado correctamente.');

        return self::SUCCESS;
    }
}
