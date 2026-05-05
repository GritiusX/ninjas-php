<?php

namespace Database\Seeders;

use App\Models\Client;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    public function run(): void
    {
        $clients = [
            [
                'name' => 'Café Gourmet BA',
                'context_path' => 'brand-contexts/1.md',
                'roas_goal' => 4.00,
            ],
            [
                'name' => 'FitStore Argentina',
                'context_path' => 'brand-contexts/2.md',
                'roas_goal' => 3.50,
            ],
            [
                'name' => 'TechHogar',
                'context_path' => 'brand-contexts/3.md',
                'roas_goal' => 3.00,
            ],
        ];

        foreach ($clients as $client) {
            Client::create($client);
        }
    }
}
