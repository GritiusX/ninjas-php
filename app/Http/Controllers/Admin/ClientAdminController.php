<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientAdminController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/clients/index', [
            'clients' => Client::orderBy('name')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/clients/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'                   => ['required', 'string', 'max:120'],
            'whatsapp_number'        => ['nullable', 'string', 'max:30'],
            'roas_goal'              => ['required', 'numeric', 'min:0'],
            'meta_ad_account_id'     => ['nullable', 'string', 'max:50'],
            'meta_access_token'      => ['nullable', 'string'],
            'metricool_blog_id'      => ['nullable', 'string', 'max:30'],
            'google_ads_customer_id' => ['nullable', 'string', 'max:50'],
        ]);

        Client::create($data);

        return redirect()->route('admin.clients.index')->with('success', 'Cliente creado.');
    }

    public function edit(Client $client): Response
    {
        return Inertia::render('admin/clients/edit', ['client' => $client]);
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        $data = $request->validate([
            'name'                   => ['required', 'string', 'max:120'],
            'whatsapp_number'        => ['nullable', 'string', 'max:30'],
            'roas_goal'              => ['required', 'numeric', 'min:0'],
            'meta_ad_account_id'     => ['nullable', 'string', 'max:50'],
            'meta_access_token'      => ['nullable', 'string'],
            'metricool_blog_id'      => ['nullable', 'string', 'max:30'],
            'google_ads_customer_id' => ['nullable', 'string', 'max:50'],
        ]);

        // No sobreescribir el token si viene vacío (el campo se deja en blanco cuando no se quiere cambiar)
        if (empty($data['meta_access_token'])) {
            unset($data['meta_access_token']);
        }

        $client->update($data);

        return redirect()->route('admin.clients.index')->with('success', 'Cliente actualizado.');
    }

    public function destroy(Client $client): RedirectResponse
    {
        $client->delete();

        return redirect()->route('admin.clients.index')->with('success', 'Cliente eliminado.');
    }
}
