<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ClientWhatsAppController extends Controller
{
    public function update(Request $request, Client $client): RedirectResponse
    {
        $request->validate([
            'whatsapp_number' => ['required', 'string', 'max:30'],
        ]);

        $client->update(['whatsapp_number' => $request->whatsapp_number]);

        return back();
    }
}
