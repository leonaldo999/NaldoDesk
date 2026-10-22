<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireBusinessAssignment
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->business_id) {
            return response()->json([
                'message' => 'Esta cuenta todavía no está asociada a un negocio.',
            ], 409);
        }

        return $next($request);
    }
}
