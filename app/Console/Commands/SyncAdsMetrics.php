<?php

namespace App\Console\Commands;

use App\Models\AdMetric;
use App\Models\Client;
use App\Services\GoogleAdsService;
use App\Services\MetaAdsService;
use Illuminate\Console\Command;

class SyncAdsMetrics extends Command
{
    protected $signature = 'ads:sync
                            {--from= : Fecha de inicio (Y-m-d). Default: hace 7 días}
                            {--to=   : Fecha de fin (Y-m-d). Default: hoy}
                            {--client= : ID de un cliente específico}
                            {--platform=all : google | meta | all}';

    protected $description = 'Sincroniza métricas de Google Ads y Meta Ads hacia ad_metrics';

    public function handle(GoogleAdsService $google, MetaAdsService $meta): int
    {
        $from     = $this->option('from') ?? now()->subDays(6)->toDateString();
        $to       = $this->option('to')   ?? now()->toDateString();
        $platform = $this->option('platform');

        $this->info("Sincronizando métricas del {$from} al {$to} [{$platform}]");

        $query = Client::query();

        if ($clientId = $this->option('client')) {
            $query->where('id', $clientId);
        }

        $clients = $query->get();

        foreach ($clients as $client) {
            $this->line("  → {$client->name}");

            if (in_array($platform, ['google', 'all']) && $client->google_ads_customer_id) {
                $this->syncPlatform('Google Ads', $client, $google->fetchMetrics($client->google_ads_customer_id, $from, $to));
            }

            if (in_array($platform, ['meta', 'all']) && $client->meta_ad_account_id) {
                $clientToken = $client->meta_access_token ?: null;
                $this->syncPlatform('Meta Ads', $client, $meta->fetchMetrics($client->meta_ad_account_id, $from, $to, $clientToken));
            }
        }

        $this->info('Sincronización completada.');
        return self::SUCCESS;
    }

    /**
     * @param array<int, array{date: string, investment: float, revenue: float, transactions: int}> $rows
     */
    private function syncPlatform(string $label, Client $client, array $rows): void
    {
        if (empty($rows)) {
            $this->warn("    [{$label}] Sin datos o credenciales no configuradas.");
            return;
        }

        foreach ($rows as $row) {
            AdMetric::updateOrCreate(
                ['client_id' => $client->id, 'date' => $row['date']],
                [
                    'investment'   => $row['investment'],
                    'revenue'      => $row['revenue'],
                    'transactions' => $row['transactions'],
                ]
            );
        }

        $this->line("    [{$label}] " . count($rows) . ' días sincronizados.');
    }
}
