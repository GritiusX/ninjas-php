<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_active) {
            abort(403);
        }

        // admin tiene acceso a todo
        if ($user->role === 'admin') {
            return $next($request);
        }

        if (! in_array($user->role, $roles)) {
            abort(403);
        }

        return $next($request);
    }
}
