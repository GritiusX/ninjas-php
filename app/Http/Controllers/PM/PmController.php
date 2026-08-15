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
            ->whereNotIn('status', [ContentPiece::STATUS_CLIENT_APPROVED, ContentPiece::STATUS_PUBLISHED])
            // Las tareas trabadas en CLIENT_REVISION (cliente pidió cambios,
            // falta que el PM avise al editor) van primero para que no se
            // pierdan en la tabla mezcladas con el resto.
            ->orderByRaw("CASE WHEN status = '" . ContentPiece::STATUS_CLIENT_REVISION . "' AND assigned_editor_id IS NOT NULL THEN 0 ELSE 1 END")
            ->orderBy('priority')
            ->orderByRaw('deadline IS NULL, deadline ASC')
            ->get();

        $clients = Client::orderBy('name')->get(['id', 'name']);
        $editors = User::whereIn('role', ['editor', 'pm', 'admin', 'superadmin'])->where('is_active', true)->orderBy('name')->get(['id', 'name', 'role']);

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

        // Tareas trabadas en CLIENT_REVISION: el cliente ya pidió cambios pero
        // el editor no se entera hasta que el PM ejecute notify-editor. Se
        // muestran aparte y arriba de todo para que no pasen desapercibidas.
        $pendingEditorNotify = ContentPiece::with(['client', 'editor'])
            ->where('status', ContentPiece::STATUS_CLIENT_REVISION)
            ->whereNotNull('assigned_editor_id')
            ->orderBy('updated_at')
            ->get();

        $approvedQueue = ContentPiece::with(['client', 'editor'])
            ->where('status', ContentPiece::STATUS_CLIENT_APPROVED)
            ->orderBy('priority')
            ->orderBy('updated_at', 'desc')
            ->get();

        $publishedQueue = ContentPiece::with(['client', 'editor'])
            ->where('status', ContentPiece::STATUS_PUBLISHED)
            ->orderBy('updated_at', 'desc')
            ->get();

        $clients = Client::orderBy('name')->get(['id', 'name']);
        $editors = User::whereIn('role', ['editor', 'pm', 'admin', 'superadmin'])->where('is_active', true)->orderBy('name')->get(['id', 'name', 'role']);

        return Inertia::render('pm/dashboard', [
            'reviewQueue'         => $reviewQueue,
            'briefQueue'          => $briefQueue,
            'approvedQueue'       => $approvedQueue,
            'publishedQueue'      => $publishedQueue,
            'pendingEditorNotify' => $pendingEditorNotify,
            'clients'             => $clients,
            'editors'             => $editors,
        ]);
    }
}
