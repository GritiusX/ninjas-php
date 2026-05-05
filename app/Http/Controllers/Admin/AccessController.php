<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\TemporaryAccess;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccessController extends Controller
{
    public function matrix(): Response
    {
        $editors = User::where('role', 'editor')->where('is_active', true)->orderBy('name')->get();
        $clients = Client::orderBy('name')->get();

        $accesses = TemporaryAccess::where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->get()
            ->groupBy('user_id');

        return Inertia::render('admin/matrix', [
            'editors' => $editors,
            'clients' => $clients,
            'accesses' => $accesses,
        ]);
    }

    public function grant(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'user_id'    => ['required', 'exists:users,id'],
            'client_id'  => ['required', 'exists:clients,id'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        TemporaryAccess::firstOrCreate(
            ['user_id' => $data['user_id'], 'client_id' => $data['client_id']],
            ['granted_by' => $request->user()->id, 'expires_at' => $data['expires_at'] ?? null, 'created_at' => now()],
        );

        return back()->with('success', 'Acceso otorgado.');
    }

    public function revoke(TemporaryAccess $access): RedirectResponse
    {
        $access->delete();

        return back()->with('success', 'Acceso revocado.');
    }
}
