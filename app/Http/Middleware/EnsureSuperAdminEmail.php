<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdminEmail
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->email !== 'admin@littleninjas.com.ar') {
            abort(403);
        }

        return $next($request);
    }
}
