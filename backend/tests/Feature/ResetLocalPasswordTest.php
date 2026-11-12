<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ResetLocalPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_changes_only_the_selected_account_and_closes_its_sessions(): void
    {
        $this->app->instance('env', 'local');
        config(['session.driver' => 'database']);
        $business = Business::create(['name' => 'Negocio de prueba']);
        $user = User::factory()->create(['business_id' => $business->id])->refresh();
        $other = User::factory()->create();
        foreach ([$user, $other] as $account) {
            DB::table('sessions')->insert([
                'id' => 'test-'.$account->id,
                'user_id' => $account->id,
                'payload' => '',
                'last_activity' => time(),
            ]);
        }

        $this->artisan('naldo:reset-password')
            ->expectsQuestion('Correo de tu cuenta', $user->email)
            ->expectsQuestion('Nueva contraseña (mínimo 12 caracteres)', 'test-reset-password-42')
            ->expectsQuestion('Confirma la nueva contraseña', 'test-reset-password-42')
            ->assertSuccessful();

        $updated = $user->fresh();
        $this->assertTrue(Hash::check('test-reset-password-42', $updated->password));
        $this->assertSame($business->id, $updated->business_id);
        $this->assertSame($user->role, $updated->role);
        $this->assertSame($other->password, $other->fresh()->password);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseHas('sessions', ['user_id' => $other->id]);
    }

    public function test_reset_is_unavailable_outside_the_local_environment(): void
    {
        $this->artisan('naldo:reset-password')->assertFailed();
    }
}
