<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\ContentPiece;
use App\Models\User;

class NotificationService
{
    public function notifyPmVideoSubmitted(ContentPiece $piece, User $editor): void
    {
        $pms = User::whereIn('role', ['pm', 'admin'])->where('is_active', true)->get();

        foreach ($pms as $pm) {
            AppNotification::create([
                'user_id'    => $pm->id,
                'type'       => 'video.submitted',
                'title'      => "[{$piece->client->name}] {$editor->name} subió el video para revisión",
                'body'       => $piece->concept ?? $piece->product,
                'link'       => "/pm/review/{$piece->id}",
                'created_at' => now(),
            ]);
        }
    }

    public function notifyEditorChangesRequested(ContentPiece $piece): void
    {
        if (!$piece->assigned_editor_id) {
            return;
        }

        AppNotification::create([
            'user_id'    => $piece->assigned_editor_id,
            'type'       => 'changes.requested',
            'title'      => "[{$piece->client->name}] El PM pidió cambios",
            'body'       => $piece->internal_comments,
            'link'       => "/editor",
            'created_at' => now(),
        ]);
    }

    public function notifyPmClientApproved(ContentPiece $piece): void
    {
        $pms = User::whereIn('role', ['pm', 'admin'])->where('is_active', true)->get();

        foreach ($pms as $pm) {
            AppNotification::create([
                'user_id'    => $pm->id,
                'type'       => 'client.approved',
                'title'      => "✅ [{$piece->client->name}] El cliente aprobó el contenido",
                'body'       => $piece->concept ?? $piece->product,
                'link'       => "/pm/review/{$piece->id}",
                'created_at' => now(),
            ]);
        }
    }

    public function notifyTaskPaused(ContentPiece $piece, User $editor, string $reason): void
    {
        $title = "⏸ [{$piece->client->name}] {$editor->name} pausó una tarea";
        $body  = "\"{$reason}\" — Tarea: " . ($piece->concept ?? $piece->product ?? "#{$piece->id}");
        $link  = "/pm/review/{$piece->id}";

        $recipients = User::whereIn('role', ['pm', 'admin'])->where('is_active', true)->get();

        foreach ($recipients as $recipient) {
            AppNotification::create([
                'user_id'    => $recipient->id,
                'type'       => 'task.paused',
                'title'      => $title,
                'body'       => $body,
                'link'       => $link,
                'created_at' => now(),
            ]);
        }
    }

    public function notifyPmClientRequestedChanges(ContentPiece $piece, string $message): void
    {
        $pms = User::whereIn('role', ['pm', 'admin'])->where('is_active', true)->get();

        foreach ($pms as $pm) {
            AppNotification::create([
                'user_id'    => $pm->id,
                'type'       => 'client.changes',
                'title'      => "✏️ [{$piece->client->name}] El cliente pidió cambios",
                'body'       => $message,
                'link'       => "/pm/review/{$piece->id}",
                'created_at' => now(),
            ]);
        }

        // Notificar al editor asignado si lo hay
        if ($piece->assigned_editor_id) {
            AppNotification::create([
                'user_id'    => $piece->assigned_editor_id,
                'type'       => 'changes.requested',
                'title'      => "[{$piece->client->name}] El cliente pidió cambios",
                'body'       => $message,
                'link'       => "/editor",
                'created_at' => now(),
            ]);
        }
    }
}
