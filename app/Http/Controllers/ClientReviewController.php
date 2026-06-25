<?php

namespace App\Http\Controllers;

use App\Models\ContentPiece;
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
        $piece = ContentPiece::with('client')
            ->where('review_token', $token)
            ->firstOrFail();

        $alreadyResponded = in_array($piece->status, [
            ContentPiece::STATUS_CLIENT_APPROVED,
            ContentPiece::STATUS_CLIENT_REVISION,
        ]);

        return Inertia::render('client-review', [
            'piece'            => $this->safePiece($piece),
            'already_responded'=> $alreadyResponded,
            'token'            => $token,
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
            'final_video_link'  => $piece->final_video_link,
            'client_chosen_copy'=> $piece->client_chosen_copy,
            'copy_text'         => $copyText,
            'status'            => $piece->status,
        ];
    }
}
