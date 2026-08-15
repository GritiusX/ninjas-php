<?php

namespace App\Http\Controllers\Concerns;

use App\Models\ContentPiece;
use App\Models\User;
use App\Services\GoogleDriveService;
use Google\Service\Exception as GoogleServiceException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

trait HandlesPieceTask
{
    public function task(Request $request, ContentPiece $piece): Response
    {
        $user = $request->user();

        if ($piece->assigned_editor_id !== $user->id) {
            abort(403);
        }

        $piece->load('client');

        return Inertia::render($this->taskPage, [
            'piece' => $piece,
        ]);
    }

    public function submitVideo(Request $request, ContentPiece $piece): RedirectResponse
    {
        if ($piece->assigned_editor_id !== $request->user()->id) {
            abort(403);
        }

        $request->validate([
            'video'            => ['required', 'file', 'mimetypes:video/mp4,video/quicktime,video/x-msvideo', 'max:2097152'],
            'replace_previous' => ['nullable', 'boolean'],
        ]);

        $piece->load('client');
        $editor          = $request->user();
        $pieceName       = $piece->concept ?? $piece->product ?? "Pieza {$piece->id}";
        $file            = $request->file('video');
        $previousLink    = $piece->final_video_link;
        $replacePrevious = $request->boolean('replace_previous');

        set_time_limit(0);

        try {
            $drive     = new GoogleDriveService();
            $videoLink = $drive->uploadVideo(
                $file->getRealPath(),
                $file->getClientOriginalName(),
                $piece->client->name,
                $pieceName,
            );
        } catch (GoogleServiceException $e) {
            $errors = $e->getErrors();
            $reason = $errors[0]['reason'] ?? 'unknown';
            $msg = match ($reason) {
                'storageQuotaExceeded' => 'Error de Google Drive: cuota de almacenamiento agotada. Contactá al administrador.',
                'forbidden'            => 'Error de Google Drive: sin permisos para subir el archivo.',
                default                => 'Error de Google Drive: ' . ($errors[0]['message'] ?? $e->getMessage()),
            };
            return back()->withErrors(['video' => $msg]);
        } catch (\Throwable $e) {
            return back()->withErrors(['video' => 'Error al subir el video: ' . $e->getMessage()]);
        }

        $piece->update([
            'final_video_link' => $videoLink,
            'status'           => ContentPiece::STATUS_INTERNAL_REVIEW,
        ]);

        if ($replacePrevious && $previousLink) {
            $oldFileId = $drive->extractFileId($previousLink);
            if ($oldFileId) {
                try {
                    $drive->deleteFile($oldFileId);
                } catch (\Throwable $e) {
                    report($e);
                }
            }
        }

        $this->notifications->notifyPmVideoSubmitted($piece, $editor);

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

        return back()->with('success', 'Video subido y enviado para revisión.');
    }
}
