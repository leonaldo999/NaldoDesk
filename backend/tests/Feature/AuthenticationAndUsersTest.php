<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Business;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Tests\TestCase;

class AuthenticationAndUsersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['sanctum.stateful' => ['localhost:5173']]);
    }

    public function test_guest_cannot_access_profile_or_user_management(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->getJson('/api/users')->assertUnauthorized();
    }

    public function test_user_can_log_in_and_read_a_safe_profile(): void
    {
        $user = User::create([
            'name' => 'Admin Naldo',
            'email' => 'admin@example.test',
            'password' => 'a-long-test-password',
            'role' => UserRole::Admin,
        ]);

        $this->withoutMiddleware(ValidateCsrfToken::class)
            ->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'a-long-test-password',
        ])->assertOk()
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonMissingPath('user.password');

        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.id', $user->id);
        $this->postJson('/api/auth/logout')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_only_admin_can_manage_users_and_passwords_are_not_returned(): void
    {
        $business = Business::create(['name' => 'Negocio de prueba']);
        $staff = User::create([
            'business_id' => $business->id,
            'name' => 'Staff',
            'email' => 'staff@example.test',
            'password' => 'a-long-test-password',
            'role' => UserRole::Staff,
        ]);
        $this->actingAs($staff)->getJson('/api/users')->assertForbidden();

        $admin = User::create([
            'business_id' => $business->id,
            'name' => 'Admin',
            'email' => 'owner@example.test',
            'password' => 'a-long-test-password',
            'role' => UserRole::Admin,
        ]);

        $this->actingAs($admin)->postJson('/api/users', [
            'name' => 'New Staff',
            'email' => 'new-staff@example.test',
            'password' => 'another-long-password',
            'role' => 'staff',
        ])->assertCreated()
            ->assertJsonPath('user.role', 'staff')
            ->assertJsonMissingPath('user.password');
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        $this->postJson('/api/auth/login', [
            'email' => 'missing@example.test',
            'password' => 'wrong-password',
        ])->assertUnprocessable();
    }
}
