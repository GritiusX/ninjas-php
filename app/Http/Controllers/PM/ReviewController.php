<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ContentPiece;
use App\Models\User;
use App\Services\GeminiService;
use App\Services\NotificationService;
use App\Services\WhatsAppService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ReviewController extends Controller
{
    public function __construct(
        private GeminiService $gemini,
        private WhatsAppService $whatsapp,
        private NotificationService $notifications,
    ) {}

    public function show(ContentPiece $piece): Response
    {
        $piece->load('client', 'editor');

        return Inertia::render('pm/review', ['piece' => $piece]);
    }

    public function generateCopy(Request $request, ContentPiece $piece): RedirectResponse
    {
        $piece->load('client');

        try {
            $copy = $this->gemini->generateCopy($piece);
            $piece->update(['generated_copy' => $copy]);

            return back()->with('success', 'Copy generado correctamente.');
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function approve(Request $request, ContentPiece $piece): RedirectResponse
    {
        $piece->load('client');

        $piece->update(['status' => ContentPiece::STATUS_PM_APPROVED]);

        AuditLog::create([
            'user_id'     => $request->user()->id,
            'action'      => 'content.approved',
            'entity_type' => 'content_piece',
            'entity_id'   => $piece->id,
            'payload'     => [
                'client'    => $piece->client->name,
                'objective' => $piece->objective,
                'reviewer'  => $request->user()->name,
            ],
            'ip' => $request->ip(),
        ]);

        // Enviar WhatsApp al cliente
        $sent = $this->whatsapp->sendClientApprovalMessage($piece);

        if ($sent) {
            $piece->update(['status' => ContentPiece::STATUS_CLIENT_REVIEW]);
        }

        // Notificar al PM que se envió (o que no había número)
        $msg = $sent
            ? 'Pieza aprobada y enviada al cliente por WhatsApp.'
            : 'Pieza aprobada. (WhatsApp no configurado — no se envió al cliente.)';

        return redirect()->route('pm.dashboard')->with('success', $msg);
    }

    public function requestChanges(Request $request, ContentPiece $piece): RedirectResponse
    {
        $request->validate([
            'comments' => ['required', 'string', 'max:2000'],
        ]);

        $piece->load('client');

        $piece->update([
            'status'           => ContentPiece::STATUS_REVISION,
            'internal_comments'=> $request->comments,
        ]);

        AuditLog::create([
            'user_id'     => $request->user()->id,
            'action'      => 'content.changes_requested',
            'entity_type' => 'content_piece',
            'entity_id'   => $piece->id,
            'payload'     => [
                'client'   => $piece->client->name,
                'reviewer' => $request->user()->name,
                'comments' => $request->comments,
            ],
            'ip' => $request->ip(),
        ]);

        // Notificación en app al editor
        $this->notifications->notifyEditorChangesRequested($piece);

        return redirect()->route('pm.dashboard')->with('success', 'Cambios solicitados al editor.');
    }

    public function approveClientRevision(ContentPiece $piece): RedirectResponse
    {
        $piece->update(['status' => ContentPiece::STATUS_CLIENT_APPROVED]);

        return redirect()->route('pm.dashboard')->with('success', 'Pieza marcada como aprobada por el cliente.');
    }
}
