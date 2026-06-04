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

        // admin tiene acceso a todo
        if ($user->role === 'admin') {
            return $next($request);
        }

        if (! in_array($user->role, $roles)) {
            return redirect()->route('dashboard');
        }

        return $next($request);
    }
}
