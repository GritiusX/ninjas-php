<?php

namespace Database\Seeders;

use App\Models\AdMetric;
use Illuminate\Database\Seeder;

class AdMetricSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            // Café Gourmet BA (client_id=1, roas_goal=4.00) — por encima del objetivo
            ['client_id' => 1, 'investment' => 5200, 'revenue' => 23400, 'transactions' => 48],
            ['client_id' => 1, 'investment' => 4800, 'revenue' => 21600, 'transactions' => 44],
            ['client_id' => 1, 'investment' => 5500, 'revenue' => 24750, 'transactions' => 52],
            ['client_id' => 1, 'investment' => 4200, 'revenue' => 18480, 'transactions' => 38],
            ['client_id' => 1, 'investment' => 6100, 'revenue' => 27450, 'transactions' => 57],
            ['client_id' => 1, 'investment' => 5800, 'revenue' => 25520, 'transactions' => 54],
            ['client_id' => 1, 'investment' => 4900, 'revenue' => 21560, 'transactions' => 45],

            // FitStore Argentina (client_id=2, roas_goal=3.50) — zona amarilla (~80% del objetivo)
            ['client_id' => 2, 'investment' => 8500, 'revenue' => 23800, 'transactions' => 62],
            ['client_id' => 2, 'investment' => 9200, 'revenue' => 25760, 'transactions' => 68],
            ['client_id' => 2, 'investment' => 7800, 'revenue' => 21840, 'transactions' => 55],
            ['client_id' => 2, 'investment' => 10100, 'revenue' => 28280, 'transactions' => 74],
            ['client_id' => 2, 'investment' => 8900, 'revenue' => 24920, 'transactions' => 65],
            ['client_id' => 2, 'investment' => 9600, 'revenue' => 26880, 'transactions' => 71],
            ['client_id' => 2, 'investment' => 8200, 'revenue' => 22960, 'transactions' => 59],

            // TechHogar (client_id=3, roas_goal=3.00) — rojo (<80% del objetivo)
            ['client_id' => 3, 'investment' => 12000, 'revenue' => 25200, 'transactions' => 28],
            ['client_id' => 3, 'investment' => 11500, 'revenue' => 24150, 'transactions' => 26],
            ['client_id' => 3, 'investment' => 13200, 'revenue' => 27720, 'transactions' => 31],
            ['client_id' => 3, 'investment' => 10800, 'revenue' => 22680, 'transactions' => 24],
            ['client_id' => 3, 'investment' => 14000, 'revenue' => 29400, 'transactions' => 33],
            ['client_id' => 3, 'investment' => 12500, 'revenue' => 26250, 'transactions' => 29],
            ['client_id' => 3, 'investment' => 11000, 'revenue' => 23100, 'transactions' => 25],
        ];

        foreach ($data as $i => $row) {
            $clientIndex = (int) floor($i / 7);
            $dayOffset = $i % 7;

            AdMetric::create([
                'client_id' => $row['client_id'],
                'date' => now()->subDays(6 - $dayOffset)->toDateString(),
                'investment' => $row['investment'],
                'revenue' => $row['revenue'],
                'transactions' => $row['transactions'],
            ]);
        }
    }
}
