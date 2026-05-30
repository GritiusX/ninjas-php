<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\ContentPiece;
use App\Models\User;
use Illuminate\Database\Seeder;

class ContentPieceSeeder extends Seeder
{
    public function run(): void
    {
        $ana   = User::where('email', 'ana@littleninjas.com.ar')->first();
        $marco = User::where('email', 'marco@littleninjas.com.ar')->first();

        $drive = 'https://drive.google.com/drive/folders/';

        $c = fn(string $name) => Client::where('name', $name)->value('id');

        $pieces = [

            // ── Café Gourmet BA ───────────────────────────────────────────────

            [
                'client_id'          => $c('Café Gourmet BA'),
                'assigned_editor_id' => $ana->id,
                'status'             => 'EDITING',
                'priority'           => 1,
                'deadline'           => now()->addDay(),
                'concept'            => 'Lanzamiento Cold Brew artesanal',
                'product'            => 'Cold Brew 24hs',
                'category'           => 'Lanzamiento',
                'objective'          => 'Generar awareness del nuevo producto y conversiones directas en la tienda online',
                'hook'               => 'Manos vertiendo café negro en vaso con hielo en cámara lenta, condensación visible',
                'development'        => 'Mostrar el proceso de 24hs de maceración, resultado final, persona disfrutándolo',
                'cta'                => 'Pedí el tuyo en cafegourmetba.com.ar',
                'brief_notes'        => 'Textura suave y sabor concentrado. Evitar comparaciones con Starbucks.',
                'raw_material_links' => [$drive . 'coldbrewraw1', $drive . 'coldbrewraw2'],
            ],
            [
                'client_id'          => $c('Café Gourmet BA'),
                'assigned_editor_id' => $ana->id,
                'status'             => 'INTERNAL_REVIEW',
                'priority'           => 2,
                'deadline'           => now()->addDays(2),
                'concept'            => 'Campaña de retención — suscriptores activos',
                'product'            => 'Suscripción mensual de café',
                'category'           => 'Retención',
                'objective'          => 'Reducir churn y recordar el valor de la suscripción mensual',
                'hook'               => 'Persona abriendo caja de café en su puerta, cara de satisfacción',
                'development'        => 'Unboxing, aroma, ritual matutino, conveniencia de recibirlo en casa',
                'cta'                => 'Renovar tu suscripción con 15% OFF',
                'brief_notes'        => 'Tono cálido. Dirigido a suscriptores sin compra en 30 días.',
                'raw_material_links' => [$drive . 'retencionraw1'],
                'final_video_link'   => 'https://drive.google.com/file/d/demo_final_video/view',
            ],
            [
                'client_id'          => $c('Café Gourmet BA'),
                'assigned_editor_id' => $ana->id,
                'status'             => 'CLIENT_REVIEW',
                'priority'           => 2,
                'deadline'           => now()->addDays(7),
                'concept'            => 'Temporada invernal — blend especial',
                'product'            => 'Blend Invierno Edición Limitada',
                'category'           => 'Estacional',
                'objective'          => 'Posicionar el blend de invierno como regalo premium',
                'hook'               => 'Taza humeante entre manos en día de lluvia, ventana empañada de fondo',
                'development'        => 'Mostrar blend, aroma, notas de cata, packaging premium',
                'cta'                => 'Conseguilo antes que se agote',
                'raw_material_links' => [$drive . 'invernalraw'],
                'final_video_link'   => 'https://drive.google.com/file/d/demo_invernal/view',
            ],
            [
                'client_id'          => $c('Café Gourmet BA'),
                'assigned_editor_id' => null,
                'status'             => 'BRIEF',
                'priority'           => 3,
                'deadline'           => now()->addDays(14),
                'concept'            => 'Tutorial — cómo preparar el café perfecto en casa',
                'product'            => 'Kit de preparación en casa',
                'category'           => 'Educativo',
                'objective'          => 'Posicionar como expertos y generar interés en el kit',
                'hook'               => 'Close-up de manos ajustando un V60, vapor de agua suave',
                'development'        => 'Paso a paso de preparación, resultado final, llamado a comprar el kit',
                'cta'                => 'Kit disponible en la web',
                'raw_material_links' => [$drive . 'tutorialraw'],
            ],

            // ── FitStore Argentina ────────────────────────────────────────────

            [
                'client_id'          => $c('FitStore Argentina'),
                'assigned_editor_id' => $ana->id,
                'status'             => 'EDITING',
                'priority'           => 2,
                'deadline'           => now()->addDays(4),
                'concept'            => 'Stack de invierno — suplementos para el frío',
                'product'            => 'Whey Isolate + Pre-workout',
                'category'           => 'Promoción',
                'objective'          => 'Aumentar ticket promedio con combos estacionales',
                'hook'               => 'Atleta entrenando en gym oscuro con iluminación dramática',
                'development'        => 'Producto, beneficios clave, combo precio especial',
                'cta'                => 'Armá tu stack en fitstore.com.ar',
                'brief_notes'        => 'Usar testimonios reales si hay disponibles.',
                'raw_material_links' => [$drive . 'stackraw'],
            ],
            [
                'client_id'          => $c('FitStore Argentina'),
                'assigned_editor_id' => $ana->id,
                'status'             => 'REVISION',
                'priority'           => 1,
                'deadline'           => now()->addDays(1),
                'concept'            => 'Rutina de 30 días — transformación visible',
                'product'            => 'Programa Fit30',
                'category'           => 'Transformación',
                'objective'          => 'Generar leads para el programa de 30 días',
                'hook'               => 'Split antes/después en 5 segundos, música motivacional',
                'development'        => 'Testimonios reales, metodología, precio especial de lanzamiento',
                'cta'                => 'Empezá tu transformación hoy',
                'brief_notes'        => 'Cambios pedidos: acortar los primeros 3 segundos, el hook tarda mucho.',
                'internal_comments'  => 'El hook tarda demasiado, necesita ir más al grano. Reducir intro a 2 seg.',
                'raw_material_links' => [$drive . 'fit30raw1', $drive . 'fit30raw2'],
            ],
            [
                'client_id'          => $c('FitStore Argentina'),
                'assigned_editor_id' => null,
                'status'             => 'BRIEF',
                'priority'           => 3,
                'deadline'           => now()->addDays(10),
                'concept'            => 'Guantes de crossfit — nuevo modelo',
                'product'            => 'Guantes CrossFit Pro',
                'category'           => 'Producto',
                'objective'          => 'Lanzar el nuevo modelo y generar primeras ventas',
                'hook'               => 'Manos con guantes golpeando la barra de pull-up',
                'cta'                => 'Comprá los tuyos',
                'raw_material_links' => [$drive . 'guantesraw'],
            ],

            // ── TechHogar ─────────────────────────────────────────────────────

            [
                'client_id'          => $c('TechHogar'),
                'assigned_editor_id' => $marco->id,
                'status'             => 'INTERNAL_REVIEW',
                'priority'           => 1,
                'deadline'           => now()->subDay(),
                'concept'            => 'Robot aspirador — limpieza sin esfuerzo',
                'product'            => 'SmartVac 3000',
                'category'           => 'Producto',
                'objective'          => 'Posicionar como solución para hogares ocupados',
                'hook'               => 'Robot limpiando piso brillante mientras dueños descansan',
                'development'        => 'Demo de funcionamiento, app de control, precio cuotas',
                'cta'                => 'Conseguilo en 12 cuotas sin interés',
                'raw_material_links' => [$drive . 'smartvacraw'],
                'final_video_link'   => 'https://drive.google.com/file/d/demo_smartvac/view',
            ],
            [
                'client_id'          => $c('TechHogar'),
                'assigned_editor_id' => $marco->id,
                'status'             => 'EDITING',
                'priority'           => 2,
                'deadline'           => now()->addDays(6),
                'concept'            => 'Freidora de aire — recetas saludables',
                'product'            => 'AirFry Pro',
                'category'           => 'Lifestyle',
                'objective'          => 'Mostrar versatilidad y estilo de vida saludable',
                'hook'               => 'Papas fritas crujientes saliendo de la freidora sin aceite',
                'development'        => 'Recetas variadas en 30 segundos, resultado visual apetecible',
                'cta'                => 'Tu aliada en la cocina saludable',
                'raw_material_links' => [$drive . 'airfryraw'],
            ],
            [
                'client_id'          => $c('TechHogar'),
                'assigned_editor_id' => null,
                'status'             => 'BRIEF',
                'priority'           => 3,
                'deadline'           => now()->addDays(20),
                'concept'            => 'Termo inteligente — café a la temperatura exacta',
                'product'            => 'SmartThermo',
                'category'           => 'Producto',
                'objective'          => 'Generar deseo en público oficinista',
                'hook'               => 'Display digital del termo mostrando temperatura perfecta',
                'cta'                => 'Compralo en techhogar.com.ar',
                'raw_material_links' => [$drive . 'thermoraw'],
            ],

            // ── Moda Porteña ──────────────────────────────────────────────────

            [
                'client_id'          => $c('Moda Porteña'),
                'assigned_editor_id' => $marco->id,
                'status'             => 'PM_APPROVED',
                'priority'           => 2,
                'deadline'           => now()->addDays(3),
                'concept'            => 'Colección invierno — abrigos premium',
                'product'            => 'Línea Winter 2025',
                'category'           => 'Colección',
                'objective'          => 'Posicionar la línea como moda premium porteña',
                'hook'               => 'Modelo caminando por San Telmo con abrigo oversized, viento en el pelo',
                'development'        => 'Desfile urbano de prendas, texturas de cerca, precio justo',
                'cta'                => 'Nueva colección disponible',
                'raw_material_links' => [$drive . 'modawinraw1', $drive . 'modawinraw2'],
                'final_video_link'   => 'https://drive.google.com/file/d/demo_moda_winter/view',
            ],
            [
                'client_id'          => $c('Moda Porteña'),
                'assigned_editor_id' => $marco->id,
                'status'             => 'CLIENT_REVISION',
                'priority'           => 1,
                'deadline'           => now()->addDays(2),
                'concept'            => 'Saldo de temporada — hasta 50% OFF',
                'product'            => 'Ropa de temporada anterior',
                'category'           => 'Promoción',
                'objective'          => 'Liquidar stock antes del cambio de colección',
                'hook'               => 'Precio tachado en rojo, mano eligiendo prenda del perchero',
                'development'        => 'Descuentos reales, tiempo limitado, urgencia de stock',
                'cta'                => 'Últimas unidades — comprá ahora',
                'brief_notes'        => 'Cliente pidió más variedad de colores en pantalla.',
                'internal_comments'  => 'Mostrar más variantes de color. Reducir texto en pantalla.',
                'raw_material_links' => [$drive . 'saldoraw'],
                'final_video_link'   => 'https://drive.google.com/file/d/demo_saldo/view',
            ],
            [
                'client_id'          => $c('Moda Porteña'),
                'assigned_editor_id' => null,
                'status'             => 'BRIEF',
                'priority'           => 3,
                'deadline'           => now()->addDays(18),
                'concept'            => 'Lookbook primavera — adelanto de temporada',
                'product'            => 'Colección Primavera 2025',
                'category'           => 'Colección',
                'objective'          => 'Generar expectativa para la próxima colección',
                'hook'               => 'Modelo en jardín con vestido floreado, luz natural',
                'cta'                => 'Mirá el adelanto en nuestro Instagram',
                'raw_material_links' => [$drive . 'lookbookraw'],
            ],

            // ── Suplementos Pro AR ────────────────────────────────────────────

            [
                'client_id'          => $c('Suplementos Pro AR'),
                'assigned_editor_id' => $marco->id,
                'status'             => 'EDITING',
                'priority'           => 2,
                'deadline'           => now()->addDays(5),
                'concept'            => 'Creatina — rendimiento real sin mitos',
                'product'            => 'Creatina Monohidrato 500g',
                'category'           => 'Educativo',
                'objective'          => 'Desmitificar la creatina y generar confianza',
                'hook'               => 'Atleta rompiendo récord personal en sentadilla',
                'development'        => 'Explicación científica simple, dosis, beneficios en 30 días',
                'cta'                => 'Empezá tu ciclo este mes',
                'raw_material_links' => [$drive . 'creatinaraw'],
            ],
            [
                'client_id'          => $c('Suplementos Pro AR'),
                'assigned_editor_id' => null,
                'status'             => 'BRIEF',
                'priority'           => 3,
                'deadline'           => now()->addDays(12),
                'concept'            => 'Proteína vegana — sin comprometer resultados',
                'product'            => 'Plant Protein 1kg',
                'category'           => 'Producto',
                'objective'          => 'Captar mercado fitness que busca opciones plant-based',
                'hook'               => 'Batido verde vibrante siendo preparado, espuma natural',
                'cta'                => 'Probá la diferencia',
                'raw_material_links' => [$drive . 'veganaraw'],
            ],

            // ── BellezaNatural AR ─────────────────────────────────────────────

            [
                'client_id'          => $c('BellezaNatural AR'),
                'assigned_editor_id' => $ana->id,
                'status'             => 'EDITING',
                'priority'           => 2,
                'deadline'           => now()->addDays(8),
                'concept'            => 'Sérum vitamina C — resultados en 2 semanas',
                'product'            => 'Sérum Vit-C 30ml',
                'category'           => 'Producto',
                'objective'          => 'Convertir audiencia que ya conoce el producto en compradores',
                'hook'               => 'Piel radiante de cerca, gotero de sérum naranja brillante',
                'development'        => 'Antes/después, ingredientes naturales, precio accesible',
                'cta'                => 'Comprar sérum',
                'raw_material_links' => [$drive . 'serumraw1', $drive . 'serumraw2'],
            ],
            [
                'client_id'          => $c('BellezaNatural AR'),
                'assigned_editor_id' => null,
                'status'             => 'BRIEF',
                'priority'           => 3,
                'deadline'           => now()->addDays(22),
                'concept'            => 'Rutina de skincare — 3 pasos esenciales',
                'product'            => 'Kit Rutina Esencial',
                'category'           => 'Educativo',
                'objective'          => 'Introducir a nuevas clientas en la rutina básica',
                'hook'               => 'Baño minimalista, 3 productos en línea, luz suave matutina',
                'cta'                => 'Empezá tu rutina',
                'raw_material_links' => [$drive . 'skincareraw'],
            ],
        ];

        foreach ($pieces as $data) {
            ContentPiece::create($data);
        }
    }
}
