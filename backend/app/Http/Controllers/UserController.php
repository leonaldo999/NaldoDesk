<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->where('business_id', $request->user()->business_id)
            ->orderBy('id')
            ->get(['id', 'business_id', 'name', 'email', 'role', 'created_at']);

        return response()->json(['data' => $users->map(fn (User $user): array => $this->userData($user))]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12'],
            'role' => ['required', Rule::enum(UserRole::class)],
        ]);

        $user = User::create([
            ...$validated,
            'business_id' => $request->user()->business_id,
        ]);

        return response()->json(['user' => $this->userData($user)], 201);
    }

    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'business_id' => $user->business_id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'created_at' => $user->created_at?->toISOString(),
        ];
    }
}
