<?php

namespace App\Http\Controllers\Editor;

use App\Http\Controllers\Concerns\HandlesPieceTask;
use App\Http\Controllers\Controller;
use App\Models\ContentPiece;
use App\Services\NotificationService;
use App\Services\WhatsAppService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EditorController extends Controller
{
    use HandlesPieceTask;

    protected string $taskPage = 'editor/task';

    public function __construct(
        private NotificationService $notifications,
        private WhatsAppService $whatsapp,
    ) {}

    public function dashboard(Request $request): Response
    {
        $user = $request->user();

        $pieces = ContentPiece::with('client')
            ->where('assigned_editor_id', $user->id)
            ->whereNotIn('status', ['CLIENT_APPROVED', 'PUBLISHED'])
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
}
