<?php

namespace Database\Seeders;

use App\Models\ContentPiece;
use App\Models\User;
use Illuminate\Database\Seeder;

class ContentPieceSeeder extends Seeder
{
    public function run(): void
    {
        $ana = User::where('email', 'ana@littleninjas.com.ar')->first();

        if (ContentPiece::count() > 0) {
            return;
        }

        // Pieza 1: Café Gourmet BA — Editor Ana — EDITING — prioridad crítica — deadline mañana
        ContentPiece::create([
            'client_id' => 1,
            'assigned_editor_id' => $ana->id,
            'status' => 'EDITING',
            'priority' => 1,
            'deadline' => now()->addDay(),
            'concept' => 'Lanzamiento del nuevo Cold Brew artesanal',
            'product' => 'Cold Brew 24hs',
            'category' => 'Lanzamiento',
            'objective' => 'Generar awareness del nuevo producto y conversiones directas en la tienda online',
            'hook' => 'Manos vertiendo café negro en vaso con hielo en cámara lenta, condensación visible',
            'development' => 'Mostrar el proceso de 24 horas de maceración, resultado final, persona disfrutándolo',
            'cta' => 'Pedí el tuyo en cafegourmetba.com.ar',
            'brief_notes' => 'Enfocarse en la textura suave y el sabor concentrado. Evitar comparaciones con Starbucks.',
            'raw_material_link' => 'https://drive.google.com/drive/folders/ejemplo1',
        ]);

        // Pieza 2: FitStore Argentina — Sin editor — BRIEF — prioridad alta
        ContentPiece::create([
            'client_id' => 2,
            'assigned_editor_id' => null,
            'status' => 'BRIEF',
            'priority' => 2,
            'deadline' => now()->addDays(5),
            'concept' => 'Promoción stack de suplementos para el invierno',
            'product' => 'Whey Isolate + Pre-workout',
            'category' => 'Promoción',
            'objective' => 'Aumentar el ticket promedio con combos de suplementos para la temporada invernal',
            'hook' => 'Atleta entrenando en gym oscuro, iluminación dramática, levantando pesas pesadas',
            'development' => 'Mostrar producto, beneficios clave, combo precio especial',
            'cta' => 'Armá tu stack en fitstore.com.ar',
            'brief_notes' => 'Usar testimonios reales si hay disponibles. Mostrar etiqueta nutricional.',
        ]);

        // Pieza 3: Café Gourmet BA — Editor Ana — INTERNAL_REVIEW — prioridad alta
        ContentPiece::create([
            'client_id' => 1,
            'assigned_editor_id' => $ana->id,
            'status' => 'INTERNAL_REVIEW',
            'priority' => 2,
            'deadline' => now()->addDays(2),
            'concept' => 'Campaña de retención — suscriptores activos',
            'product' => 'Suscripción mensual de café',
            'category' => 'Retención',
            'objective' => 'Reducir churn y recordar el valor de la suscripción mensual',
            'hook' => 'Persona abriendo caja de café en su puerta, cara de satisfacción',
            'development' => 'Unboxing, aroma del café, ritual matutino, conveniencia de recibirlo en casa',
            'cta' => 'Renovar tu suscripción con 15% OFF',
            'brief_notes' => 'Tono cálido y cercano. Dirigido a suscriptores que no compraron en 30 días.',
            'final_video_link' => 'https://drive.google.com/file/d/ejemplo3/view',
        ]);
    }
}
