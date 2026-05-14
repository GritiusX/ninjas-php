<?php

namespace Database\Seeders;

use App\Models\Client;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    public function run(): void
    {
        $clients = [
            ['name' => 'Café Gourmet BA',       'context_path' => 'brand-contexts/1.md',  'roas_goal' => 4.00],
            ['name' => 'FitStore Argentina',     'context_path' => 'brand-contexts/2.md',  'roas_goal' => 3.50],
            ['name' => 'TechHogar',              'context_path' => 'brand-contexts/3.md',  'roas_goal' => 3.00],
            ['name' => 'Moda Porteña',           'context_path' => 'brand-contexts/4.md',  'roas_goal' => 3.20],
            ['name' => 'Suplementos Pro AR',     'context_path' => 'brand-contexts/5.md',  'roas_goal' => 4.50],
            ['name' => 'InmoBuenos Aires',       'context_path' => 'brand-contexts/6.md',  'roas_goal' => 2.80],
            ['name' => 'Delivery Canchero',      'context_path' => 'brand-contexts/7.md',  'roas_goal' => 3.80],
            ['name' => 'EduTech Pampa',          'context_path' => 'brand-contexts/8.md',  'roas_goal' => 2.50],
            ['name' => 'BellezaNatural AR',      'context_path' => 'brand-contexts/9.md',  'roas_goal' => 4.20],
            ['name' => 'AutoPartes Federal',     'context_path' => 'brand-contexts/10.md', 'roas_goal' => 3.10],
        ];

        foreach ($clients as $client) {
            Client::firstOrCreate(['name' => $client['name']], $client);
        }
    }
}
