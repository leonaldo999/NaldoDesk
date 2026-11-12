<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ResetLocalPassword extends Command
{
    protected $signature = 'naldo:reset-password';

    protected $description = 'Restablece la contraseña de una cuenta en el entorno local';

    public function handle(): int
    {
        if (! app()->environment('local') || ! $this->input->isInteractive()) {
            $this->components->error('Este comando requiere una terminal interactiva en el entorno local.');

            return self::FAILURE;
        }

        $email = trim((string) $this->ask('Correo de tu cuenta'));
        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $this->components->error('No se encontró una cuenta con ese correo.');

            return self::FAILURE;
        }

        $password = $this->secret('Nueva contraseña (mínimo 12 caracteres)', false);
        $confirmation = $this->secret('Confirma la nueva contraseña', false);
        $validator = Validator::make(['password' => $password], [
            'password' => ['required', 'string', 'min:12'],
        ]);

        if ($validator->fails() || ! is_string($confirmation) || ! hash_equals((string) $password, $confirmation)) {
            $this->components->error('Usa al menos 12 caracteres y asegúrate de que las dos contraseñas coincidan.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($user, $password): void {
            $user->forceFill(['password' => $password, 'remember_token' => null])->saveOrFail();

            if (config('session.driver') === 'database') {
                DB::connection(config('session.connection'))
                    ->table(config('session.table'))
                    ->where('user_id', $user->getKey())
                    ->delete();
            }
        });

        $this->components->info('Contraseña actualizada. Ya puedes iniciar sesión.');

        return self::SUCCESS;
    }
}
