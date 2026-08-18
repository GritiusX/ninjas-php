<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ContentPiece;
use App\Models\ContentPieceReviewRound;
use App\Models\GeminiUsage;
use App\Models\User;
use App\Services\GeminiService;
use App\Services\GoogleDriveService;
use App\Services\NotificationService;
use App\Services\WhatsAppService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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
        $piece->load('client', 'editor', 'reviewRounds');

        $monthlyTokenLimit = (int) config('services.gemini.monthly_token_limit', 1_000_000);

        return Inertia::render('pm/review', [
            'piece'        => $piece,
            'geminiUsage'  => [
                'monthly_tokens'  => GeminiUsage::monthlyTotal(),
                'monthly_limit'   => $monthlyTokenLimit,
                'piece_generates' => GeminiUsage::pieceCount($piece->id),
            ],
        ]);
    }

    public function generateCopy(Request $request, ContentPiece $piece): RedirectResponse
    {
        $piece->load('client');

        try {
            $result     = $this->gemini->generateCopy($piece);
            $tokensUsed = $result['tokens_used'];
            $copy       = array_diff_key($result, ['tokens_used' => true]);

            $piece->update(['generated_copy' => $copy]);

            if ($tokensUsed > 0) {
                GeminiUsage::create([
                    'user_id'          => $request->user()->id,
                    'content_piece_id' => $piece->id,
                    'tokens_used'      => $tokensUsed,
                ]);
            }

            $msg = $tokensUsed > 0
                ? "Copy generado correctamente. ({$tokensUsed} tokens usados)"
                : 'Copy generado correctamente.';

            return back()->with('success', $msg);
        } catch (RuntimeException $e) {
            Log::channel('errors')->error($e->getMessage(), [
                'url'       => request()->fullUrl(),
                'method'    => 'POST',
                'user'      => $request->user()?->email,
                'piece_id'  => $piece->id,
                'client'    => $piece->client?->name,
                'exception' => get_class($e),
            ]);

            return back()->with('error', $e->getMessage());
        }
    }

    public function updateCopy(Request $request, ContentPiece $piece): RedirectResponse
    {
        $data = $request->validate([
            'directo'      => ['nullable', 'string', 'max:2000'],
            'storytelling' => ['nullable', 'string', 'max:2000'],
            'educativo'    => ['nullable', 'string', 'max:2000'],
        ]);

        $piece->update(['generated_copy' => array_map(fn($v) => $v ?? '', $data)]);

        return back()->with('success', 'Copy guardado.');
    }

    public function approve(Request $request, ContentPiece $piece): RedirectResponse
    {
        $piece->load('client');

        $request->validate([
            'selected_copy' => ['nullable', 'in:directo,storytelling,educativo'],
        ]);

        // En re-envíos mantenemos el mismo token para que el cliente use el
        // mismo link y vea el video nuevo sin necesitar uno distinto.
        $isResend = $piece->reviewRounds()->exists();
        $token    = $isResend ? $piece->review_token : \Illuminate\Support\Str::uuid()->toString();

        $updateData = [
            'status'             => ContentPiece::STATUS_CLIENT_REVIEW,
            'client_feedback'    => null,
            'client_chosen_copy' => $request->selected_copy,
        ];
        if (! $isResend) {
            $updateData['review_token'] = $token;
        }
        $piece->update($updateData);

        AuditLog::create([
            'user_id'     => $request->user()->id,
            'action'      => 'content.approved',
            'entity_type' => 'content_piece',
            'entity_id'   => $piece->id,
            'payload'     => [
                'client'    => $piece->client->name,
                'objective' => $piece->objective,
                'reviewer'  => $request->user()->name,
                'round'     => $piece->reviewRounds()->count() + 1,
            ],
            'ip' => $request->ip(),
        ]);

        ContentPieceReviewRound::create([
            'content_piece_id'   => $piece->id,
            'round_number'       => $piece->reviewRounds()->count() + 1,
            'review_token'       => $token,
            'video_link'         => $piece->final_video_link,
            'client_chosen_copy' => $request->selected_copy,
            'sent_at'            => now(),
        ]);

        $this->whatsapp->sendClientApprovalMessage($piece);

        return redirect()->route('pm.review.show', $piece)->with('approved', true);
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

    public function resendLink(ContentPiece $piece): RedirectResponse
    {
        $newToken = \Illuminate\Support\Str::uuid()->toString();
        $oldToken = $piece->review_token;

        $piece->update([
            'status'          => ContentPiece::STATUS_CLIENT_REVIEW,
            'review_token'    => $newToken,
            'client_feedback' => null,
        ]);

        $updatedCount = 0;
        if ($oldToken) {
            $updatedCount = ContentPieceReviewRound::where('review_token', $oldToken)
                ->whereNull('responded_at')
                ->update(['review_token' => $newToken]);
        }

        // Si no había un round abierto (ej: regenerando desde INTERNAL_REVIEW
        // después de que el cliente ya respondió la ronda anterior), se crea uno nuevo.
        if ($updatedCount === 0) {
            ContentPieceReviewRound::create([
                'content_piece_id' => $piece->id,
                'round_number'     => $piece->reviewRounds()->count() + 1,
                'review_token'     => $newToken,
                'video_link'       => $piece->final_video_link,
                'sent_at'          => now(),
            ]);
        }

        return redirect()->route('pm.review.show', $piece)->with('success', 'Link regenerado. El anterior ya no es válido.');
    }

    public function notifyEditor(ContentPiece $piece): RedirectResponse
    {
        $piece->load('client');

        // El feedback del cliente vive en client_feedback (lo carga
        // ClientReviewController::respond) — lo copiamos a internal_comments
        // para que la tarea del editor (que lee internal_comments) muestre el
        // comentario real en vez de quedar vacía.
        $piece->update([
            'status'            => ContentPiece::STATUS_REVISION,
            'internal_comments' => $piece->client_feedback,
        ]);

        $this->notifications->notifyEditorClientRevision($piece);

        return redirect()->route('pm.dashboard')->with('success', 'Editor notificado. La tarea volvió a edición.');
    }

    public function approveClientRevision(ContentPiece $piece): RedirectResponse
    {
        $piece->load('client');

        $piece->update(['status' => ContentPiece::STATUS_CLIENT_APPROVED]);

        if ($piece->final_video_link) {
            $pieceName = $piece->concept ?? $piece->product ?? "Pieza {$piece->id}";
            try {
                (new GoogleDriveService())->moveVideoToDelivery(
                    $piece->final_video_link,
                    $piece->client->name,
                    $pieceName,
                );
            } catch (\Throwable) {
                // Mover en Drive es best-effort, no bloquea el flujo
            }
        }

        return redirect()->route('pm.dashboard')->with('success', 'Pieza marcada como aprobada por el cliente.');
    }
}
