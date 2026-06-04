<?php

namespace App\Http\Controllers\Editor;

use App\Http\Controllers\Controller;
use App\Models\ContentPiece;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\WhatsAppService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EditorController extends Controller
{
    public function __construct(
        private NotificationService $notifications,
        private WhatsAppService $whatsapp,
    ) {}

    public function dashboard(Request $request): Response
    {
        $user = $request->user();

        $pieces = ContentPiece::with('client')
            ->where('assigned_editor_id', $user->id)
            ->whereNotIn('status', ['CLIENT_APPROVED'])
            ->orderBy('priority')
            ->orderBy('deadline')
            ->get();

        $stats = [
            'pending'       => $pieces->whereIn('status', ['BRIEF', 'EDITING', 'REVISION'])->count(),
            'in_review'     => $pieces->where('status', 'INTERNAL_REVIEW')->count(),
            'approved_week' => ContentPiece::where('assigned_editor_id', $user->id)
                ->where('status', 'CLIENT_APPROVED')
                ->where('updated_at', '>=', now()->subDays(7))
                ->count(),
        ];

        return Inertia::render('editor/dashboard', [
            'pieces' => $pieces,
            'stats'  => $stats,
        ]);
    }

    public function task(Request $request, ContentPiece $piece): Response
    {
        $user = $request->user();

        if ($piece->assigned_editor_id !== $user->id) {
            abort(403);
        }

        $piece->load('client');

        return Inertia::render('editor/task', [
            'piece' => $piece,
        ]);
    }

    public function pause(Request $request, ContentPiece $piece): RedirectResponse
    {
        $user = $request->user();

        if ($piece->assigned_editor_id !== $user->id) {
            abort(403);
        }

        $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $piece->load('client');

        $piece->update([
            'paused_until' => now()->addHours(4),
            'pause_reason' => $request->reason,
        ]);

        $this->notifications->notifyTaskPaused($piece, $user, $request->reason);

        return back()->with('success', 'Tarea pausada por 4 horas.');
    }

    public function submitVideo(Request $request, ContentPiece $piece): RedirectResponse
    {
        $this->authorize('access-client', $piece->client_id);

        $request->validate([
            'final_video_link' => ['required', 'url', 'max:500'],
        ]);

        $piece->load('client');
        $editor = $request->user();

        $piece->update([
            'final_video_link' => $request->final_video_link,
            'status'           => ContentPiece::STATUS_INTERNAL_REVIEW,
        ]);

        // Notificación en app a los PMs
        $this->notifications->notifyPmVideoSubmitted($piece, $editor);

        // WhatsApp al PM si tiene número configurado
        $pms = User::whereIn('role', ['pm', 'admin'])
            ->where('is_active', true)
            ->whereNotNull('whatsapp_number')
            ->get();

        $reviewUrl = url("/pm/review/{$piece->id}");

        foreach ($pms as $pm) {
            $this->whatsapp->sendPmNotification(
                $pm->whatsapp_number,
                "[{$piece->client->name}] {$editor->name} subió el video para revisión. Ver en: {$reviewUrl}",
            );
        }

        return back()->with('success', 'Video enviado para revisión.');
    }
}
