<?php

namespace Database\Seeders;

use App\Models\Client;
use Illuminate\Database\Seeder;

class MetricoolBlogIdSeeder extends Seeder
{
    public function run(): void
    {
        $clients = [
            ['name' => 'Aura Natural',          'metricool_blog_id' => '5580785'],
            ['name' => 'Aura Natural Estetica', 'metricool_blog_id' => '5580799'],
            ['name' => 'Casa Mandinga',          'metricool_blog_id' => '6039361'],
            ['name' => 'Cubiertos Nicols',       'metricool_blog_id' => '4636603'],
            ['name' => 'Espacio Sommelier',      'metricool_blog_id' => '4732419'],
            ['name' => 'Eventos Parrilleros',    'metricool_blog_id' => '5953869'],
            ['name' => 'Flat Oficial',           'metricool_blog_id' => '6279695'],
            ['name' => 'Grill West AR',          'metricool_blog_id' => '3107640'],
            ['name' => 'Grill West Paraguay',    'metricool_blog_id' => '4636597'],
            ['name' => 'GWStoreOK',              'metricool_blog_id' => '3261078'],
            ['name' => 'LevelWoodArt',           'metricool_blog_id' => '5488795'],
            ['name' => 'Ñuke USA',               'metricool_blog_id' => '6245005'],
            ['name' => 'ObraSur SA',             'metricool_blog_id' => '5953623'],
            ['name' => 'Rosso Osteria',          'metricool_blog_id' => '6039346'],
            ['name' => 'Sanatorios Anchorena',   'metricool_blog_id' => '6089405'],
        ];

        foreach ($clients as $data) {
            $client = Client::firstOrCreate(
                ['name' => $data['name']],
                ['metricool_blog_id' => $data['metricool_blog_id']],
            );

            if (! $client->wasRecentlyCreated && $client->metricool_blog_id !== $data['metricool_blog_id']) {
                $client->update(['metricool_blog_id' => $data['metricool_blog_id']]);
            }

            $status = $client->wasRecentlyCreated ? 'Creado' : 'Actualizado';
            $this->command->info("{$status}: {$data['name']} → {$data['metricool_blog_id']}");
        }
    }
}
