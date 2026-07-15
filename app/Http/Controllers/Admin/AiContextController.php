<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiGlobalContext;
use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiContextController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/ai-context', [
            'clients'       => Client::orderBy('name')->get(['id', 'name', 'ai_context']),
            'globalContext' => AiGlobalContext::get(),
        ]);
    }

    public function updateGlobal(Request $request): RedirectResponse
    {
        $request->validate([
            'context' => ['required', 'string', 'max:10000'],
        ]);

        AiGlobalContext::set($request->context);

        return back()->with('success', 'Contexto global actualizado.');
    }

    public function updateClient(Request $request, Client $client): RedirectResponse
    {
        $request->validate([
            'ai_context' => ['nullable', 'string', 'max:10000'],
        ]);

        $client->update(['ai_context' => $request->ai_context ?: null]);

        return back()->with('success', "Contexto de {$client->name} actualizado.");
    }
}
