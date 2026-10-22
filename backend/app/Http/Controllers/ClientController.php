<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $search = $request->query('search');
        $clients = Client::query()
            ->where('business_id', $request->user()->business_id)
            ->when($search, fn ($query) => $query->whereRaw('LOWER(name) LIKE ?', ['%'.mb_strtolower($search).'%']))
            ->orderBy('name')
            ->paginate($this->perPage($request))
            ->through(fn (Client $client): array => $this->clientData($client));

        return response()->json($clients);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $client = Client::create([
            ...$validated,
            'business_id' => $request->user()->business_id,
            'is_active' => true,
        ]);

        return response()->json(['data' => $this->clientData($client)], 201);
    }

    public function show(Request $request, string $client): JsonResponse
    {
        $record = $this->findClient($request, $client);

        return response()->json(['data' => $this->clientData($record)]);
    }

    public function update(Request $request, string $client): JsonResponse
    {
        $record = $this->findClient($request, $client);
        $record->fill($request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'is_active' => ['sometimes', 'boolean'],
        ]));
        $record->save();

        return response()->json(['data' => $this->clientData($record)]);
    }

    private function findClient(Request $request, string $id): Client
    {
        return Client::query()
            ->where('business_id', $request->user()->business_id)
            ->findOrFail($id);
    }

    private function clientData(Client $client): array
    {
        return [
            'id' => $client->id,
            'name' => $client->name,
            'email' => $client->email,
            'phone' => $client->phone,
            'address' => $client->address,
            'notes' => $client->notes,
            'is_active' => $client->is_active,
            'created_at' => $client->created_at?->toISOString(),
            'updated_at' => $client->updated_at?->toISOString(),
        ];
    }

    private function perPage(Request $request): int
    {
        return min(100, max(1, (int) $request->query('per_page', 15)));
    }
}
