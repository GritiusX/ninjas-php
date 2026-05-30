<?php

namespace Database\Seeders;

use App\Models\AdMetric;
use App\Models\Client;
use Illuminate\Database\Seeder;

class AdMetricSeeder extends Seeder
{
    public function run(): void
    {
        if (AdMetric::count() > 0) {
            return;
        }

        $c = fn(string $name) => Client::where('name', $name)->value('id');

        // name => [base_investment, roas_multiplier, base_transactions]
        // Café Gourmet BA   → roas_goal 4.00 → verde
        // FitStore AR       → roas_goal 3.50 → amarillo (~2.8x)
        // TechHogar         → roas_goal 3.00 → rojo (~1.9x)
        $clients = [
            $c('Café Gourmet BA')    => ['inv' => 5000,  'roas' => 4.3,  'trx' => 47],
            $c('FitStore Argentina') => ['inv' => 9000,  'roas' => 2.8,  'trx' => 63],
            $c('TechHogar')          => ['inv' => 12000, 'roas' => 1.9,  'trx' => 27],
        ];

        $jitter = fn(int $base, float $pct) => (int) round($base * (1 + (mt_rand(-100, 100) / 100) * $pct));

        foreach (array_filter($clients, fn($id) => $id, ARRAY_FILTER_USE_KEY) as $clientId => $cfg) {
            for ($day = 29; $day >= 0; $day--) {
                $inv = $jitter($cfg['inv'], 0.15);
                $rev = (int) round($inv * $cfg['roas'] * (1 + (mt_rand(-8, 8) / 100)));

                AdMetric::create([
                    'client_id'    => $clientId,
                    'date'         => now()->subDays($day)->toDateString(),
                    'investment'   => $inv,
                    'revenue'      => $rev,
                    'transactions' => $jitter($cfg['trx'], 0.20),
                ]);
            }
        }
    }
}
