<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MetricoolCredential;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MetricoolCredentialController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/metricool-credentials', [
            'email'       => MetricoolCredential::getEmail(),
            'hasPassword' => filled(MetricoolCredential::getPassword()),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['nullable', 'string'],
        ]);

        MetricoolCredential::set($data['email'], $data['password'] ?? null);

        return back()->with('success', 'Credenciales de Metricool actualizadas.');
    }
}
