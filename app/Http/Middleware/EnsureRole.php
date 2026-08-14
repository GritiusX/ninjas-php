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
            return redirect()->route('login');
        }

        // admin y superadmin tienen acceso a todo
        if (in_array($user->role, ['admin', 'superadmin'])) {
            return $next($request);
        }

        if (! in_array($user->role, $roles)) {
            return redirect()->route('dashboard');
        }

        return $next($request);
    }
}
