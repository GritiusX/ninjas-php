<?php

namespace Database\Seeders;

use App\Models\Client;
use Illuminate\Database\Seeder;

class MetricoolBlogIdSeeder extends Seeder
{
    public function run(): void
    {
        $map = [
            'Aura Natural'          => '5580785',
            'Aura Natural Estetica' => '5580799',
            'Casa Mandinga'         => '6039361',
            'Cubiertos Nicols'      => '4636603',
            'Espacio Sommelier'     => '4732419',
            'Eventos Parrilleros'   => '5953869',
            'Flat Oficial'          => '6279695',
            'Grill West AR'         => '3107640',
            'Grill West Paraguay'   => '4636597',
            'GWStoreOK'             => '3261078',
            'LevelWoodArt'          => '5488795',
            'Ñuke USA'              => '6245005',
            'ObraSur SA'            => '5953623',
            'Rosso Osteria'         => '6039346',
            'Sanatorios Anchorena'  => '6089405',
        ];

        foreach ($map as $name => $blogId) {
            $updated = Client::where('name', $name)->update(['metricool_blog_id' => $blogId]);
            if ($updated === 0) {
                $this->command->warn("Cliente no encontrado: {$name}");
            } else {
                $this->command->info("OK: {$name} → {$blogId}");
            }
        }
    }
}
