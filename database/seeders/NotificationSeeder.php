<?php

namespace Database\Seeders;

use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        if (AppNotification::count() > 0) {
            return;
        }

        $admin  = User::where('email', 'gonzalo@littleninjas.com')->first();
        $felipe = User::where('email', 'felipe@littleninjas.com')->first();

        if (!$admin || !$felipe) {
            return;
        }

        $now = now();

        // Notificaciones para el PM (mix leídas / no leídas)
        $pmNotifs = [
            [
                'type'       => 'video_submitted',
                'title'      => 'Ana subió un video para revisión',
                'body'       => 'Aura Natural — Lanzamiento del nuevo Cold Brew artesanal está listo para revisar.',
                'link'       => '/pm/review',
                'read_at'    => null,
                'created_at' => $now->copy()->subMinutes(15),
            ],
            [
                'type'       => 'video_submitted',
                'title'      => 'Ana subió un video para revisión',
                'body'       => 'Aura Natural — Campaña de retención fue enviada a revisión interna.',
                'link'       => '/pm/review',
                'read_at'    => null,
                'created_at' => $now->copy()->subHours(2),
            ],
            [
                'type'       => 'client_approved',
                'title'      => 'Cliente aprobó el video',
                'body'       => 'FitStore Argentina respondió APRUEBO al video de Suplementos.',
                'link'       => '/pm',
                'read_at'    => $now->copy()->subHours(5),
                'created_at' => $now->copy()->subHours(6),
            ],
            [
                'type'       => 'brief_assigned',
                'title'      => 'Brief asignado a Ana Editora',
                'body'       => 'FitStore Argentina — Promoción stack suplementos fue asignado exitosamente.',
                'link'       => '/pm',
                'read_at'    => $now->copy()->subDay(),
                'created_at' => $now->copy()->subDay(),
            ],
        ];

        foreach ($pmNotifs as $n) {
            AppNotification::create(array_merge($n, ['user_id' => $admin->id]));
        }

        // Notificaciones para el editor (Felipe)
        $felipeNotifs = [
            [
                'type'       => 'revision_requested',
                'title'      => 'El PM solicitó cambios',
                'body'       => 'Aura Natural — Cold Brew: "Agregar más close-up del producto al final del video."',
                'link'       => '/editor/task/1',
                'read_at'    => null,
                'created_at' => $now->copy()->subHours(1),
            ],
            [
                'type'       => 'brief_assigned',
                'title'      => 'Nueva tarea asignada',
                'body'       => 'Tenés una nueva pieza asignada: FitStore Argentina — Stack Suplementos.',
                'link'       => '/editor',
                'read_at'    => $now->copy()->subHours(3),
                'created_at' => $now->copy()->subHours(4),
            ],
        ];

        foreach ($felipeNotifs as $n) {
            AppNotification::create(array_merge($n, ['user_id' => $felipe->id]));
        }
    }
}
