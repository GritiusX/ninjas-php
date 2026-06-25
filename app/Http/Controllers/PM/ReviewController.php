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

    public function index(): Response
    {
        $pieces = ContentPiece::with('client', 'editor')
            ->where('status', ContentPiece::STATUS_INTERNAL_REVIEW)
            ->orderBy('priority')
            ->orderBy('updated_at')
            ->get();

        return Inertia::render('pm/review-list', ['pieces' => $pieces]);
    }

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

        $request->validate([
            'selected_copy' => ['nullable', 'in:directo,storytelling,educativo'],
        ]);

        $token = \Illuminate\Support\Str::uuid()->toString();

        $piece->update([
            'status'             => ContentPiece::STATUS_PM_APPROVED,
            'review_token'       => $token,
            'client_chosen_copy' => $request->selected_copy,
        ]);

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

        // Siempre pasa a CLIENT_REVIEW (el link público ya está disponible)
        $piece->refresh();
        $piece->update(['status' => ContentPiece::STATUS_CLIENT_REVIEW]);

        $sent = $this->whatsapp->sendClientApprovalMessage($piece);

        $msg = $sent
            ? 'Pieza aprobada y enviada al cliente por WhatsApp.'
            : 'Pieza aprobada. Link de revisión generado (WhatsApp no configurado).';

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
