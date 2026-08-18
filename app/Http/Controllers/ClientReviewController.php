<?php

namespace App\Http\Controllers;

use App\Models\ContentPiece;
use App\Models\ContentPieceReviewRound;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientReviewController extends Controller
{
    public function __construct(
        private NotificationService $notifications,
    ) {}

    public function show(string $token): Response
    {
        $piece = ContentPiece::with(['client', 'reviewRounds' => fn ($q) => $q->whereNotNull('responded_at')->orderBy('round_number')])
            ->where('review_token', $token)
            ->first();

        if (!$piece) {
            $expiredRound = ContentPieceReviewRound::where('review_token', $token)->first();

            if ($expiredRound) {
                return Inertia::render('client-review-expired');
            }

            abort(404);
        }

        $alreadyResponded = in_array($piece->status, [
            ContentPiece::STATUS_CLIENT_APPROVED,
            ContentPiece::STATUS_CLIENT_REVISION,
        ]);

        $pastRounds = $piece->reviewRounds->map(fn ($r) => [
            'round_number'    => $r->round_number,
            'client_decision' => $r->client_decision,
            'client_feedback' => $r->client_feedback,
        ])->values();

        return Inertia::render('client-review', [
            'piece'            => $this->safePiece($piece),
            'already_responded'=> $alreadyResponded,
            'token'            => $token,
            'past_rounds'      => $pastRounds,
        ]);
    }

    public function respond(Request $request, string $token): Response
    {
        $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'comment'  => ['nullable', 'string', 'max:2000'],
        ]);

        $piece = ContentPiece::with('client')
            ->where('review_token', $token)
            ->firstOrFail();

        if ($piece->status !== ContentPiece::STATUS_CLIENT_REVIEW) {
            return Inertia::render('client-review', [
                'piece'            => $this->safePiece($piece),
                'already_responded'=> true,
                'token'            => $token,
                'error'            => 'Esta pieza ya fue respondida.',
            ]);
        }

        $decision = $request->decision;
        $comment  = $request->comment;

        if ($decision === 'reject') {
            $request->validate([
                'comment' => ['required', 'string', 'max:2000'],
            ]);
        }

        if ($decision === 'approve') {
            $piece->update([
                'status'          => ContentPiece::STATUS_CLIENT_APPROVED,
                'client_feedback' => $comment,
            ]);

            $this->notifications->notifyPmClientApproved($piece);
        } else {
            $piece->update([
                'status'          => ContentPiece::STATUS_CLIENT_REVISION,
                'client_feedback' => $comment,
            ]);

            $this->notifications->notifyPmClientRequestedChanges($piece, $comment ?? '');
        }

        ContentPieceReviewRound::where('review_token', $token)
            ->whereNull('responded_at')
            ->update([
                'client_decision' => $decision === 'approve'
                    ? ContentPieceReviewRound::DECISION_APPROVED
                    : ContentPieceReviewRound::DECISION_REVISION,
                'client_feedback' => $comment,
                'responded_at'    => now(),
            ]);

        return Inertia::render('client-review', [
            'piece'            => $this->safePiece($piece),
            'already_responded'=> true,
            'decision'         => $decision,
            'token'            => $token,
        ]);
    }

    private function safePiece(ContentPiece $piece): array
    {
        $copyText = null;

        if ($piece->client_chosen_copy && $piece->generated_copy) {
            $copyText = $piece->generated_copy[$piece->client_chosen_copy] ?? null;
        }

        return [
            'id'                => $piece->id,
            'client_name'       => $piece->client?->name ?? '',
            'title'             => $piece->title ?? $piece->concept ?? $piece->product,
            'final_video_link'  => $piece->final_video_link,
            'client_chosen_copy'=> $piece->client_chosen_copy,
            'copy_text'         => $copyText,
            'status'            => $piece->status,
        ];
    }
}
