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

        $pm    = User::where('email', 'pm@littleninjas.com.ar')->first();
        $admin = User::where('email', 'admin@littleninjas.com.ar')->first();
        $ana   = User::where('email', 'ana@littleninjas.com.ar')->first();

        if (!$pm || !$admin || !$ana) {
            return;
        }

        $now = now();

        // Notificaciones para el PM (mix leídas / no leídas)
        $pmNotifs = [
            [
                'type'       => 'video_submitted',
                'title'      => 'Ana subió un video para revisión',
                'body'       => 'Café Gourmet BA — Lanzamiento del nuevo Cold Brew artesanal está listo para revisar.',
                'link'       => '/pm/review',
                'read_at'    => null,
                'created_at' => $now->copy()->subMinutes(15),
            ],
            [
                'type'       => 'video_submitted',
                'title'      => 'Ana subió un video para revisión',
                'body'       => 'Café Gourmet BA — Campaña de retención fue enviada a revisión interna.',
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
            AppNotification::create(array_merge($n, ['user_id' => $pm->id]));
        }

        // Notificaciones para la editora (Ana)
        $anaNotifs = [
            [
                'type'       => 'revision_requested',
                'title'      => 'El PM solicitó cambios',
                'body'       => 'Café Gourmet BA — Cold Brew: "Agregar más close-up del producto al final del video."',
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

        foreach ($anaNotifs as $n) {
            AppNotification::create(array_merge($n, ['user_id' => $ana->id]));
        }

        // Notificaciones para admin
        $adminNotifs = [
            [
                'type'       => 'system',
                'title'      => 'Nuevo usuario registrado',
                'body'       => 'Ana Editora se unió al sistema con rol editor.',
                'link'       => '/admin/users',
                'read_at'    => $now->copy()->subDays(2),
                'created_at' => $now->copy()->subDays(2),
            ],
        ];

        foreach ($adminNotifs as $n) {
            AppNotification::create(array_merge($n, ['user_id' => $admin->id]));
        }
    }
}
