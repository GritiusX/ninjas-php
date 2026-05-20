<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ContentPiece;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PmController extends Controller
{
    public function tabla(): Response
    {
        $pieces = ContentPiece::with(['client', 'editor'])
            ->whereNotIn('status', [ContentPiece::STATUS_CLIENT_APPROVED])
            ->orderBy('priority')
            ->orderByRaw('deadline IS NULL, deadline ASC')
            ->get();

        $clients = Client::orderBy('name')->get(['id', 'name']);
        $editors = User::where('role', 'editor')->where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('pm/tabla', [
            'pieces'  => $pieces,
            'clients' => $clients,
            'editors' => $editors,
        ]);
    }

    public function dashboard(Request $request): Response
    {
        $reviewQueue = ContentPiece::with('client')
            ->where('status', ContentPiece::STATUS_INTERNAL_REVIEW)
            ->orderBy('priority')
            ->orderBy('deadline')
            ->get();

        $briefQueue = ContentPiece::with(['client', 'editor'])
            ->whereIn('status', [
                ContentPiece::STATUS_BRIEF,
                ContentPiece::STATUS_EDITING,
                ContentPiece::STATUS_REVISION,
                ContentPiece::STATUS_CLIENT_REVIEW,
                ContentPiece::STATUS_CLIENT_REVISION,
            ])
            ->orderBy('priority')
            ->orderBy('deadline')
            ->get();

        $clients = Client::orderBy('name')->get(['id', 'name']);
        $editors = User::where('role', 'editor')->where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('pm/dashboard', [
            'reviewQueue' => $reviewQueue,
            'briefQueue' => $briefQueue,
            'clients' => $clients,
            'editors' => $editors,
        ]);
    }
}
