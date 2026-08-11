<?php

namespace App\Console\Commands;

use App\Jobs\SnapshotMetricoolHistory;
use App\Models\Client;
use App\Models\MetricoolMetricHistory;
use Illuminate\Console\Command;

class MetricoolSnapshotHistory extends Command
{
    protected $signature = 'metricool:snapshot-history';

    protected $description = 'Despacha un snapshot diario (Selenium) por cliente para alimentar el historial de Metrics (sparklines/drill-down)';

    // Debe coincidir con MetricsController::DEFAULT_NETWORKS — las redes que
    // se scrapean cuando el cliente no tiene metricool_networks configurado.
    private const DEFAULT_NETWORKS = ['facebook', 'instagram'];

    // Debe coincidir con MetricsController::AUTO_RESCRAPE_AFTER_DAYS / defaultRange().
    private const AUTO_RESCRAPE_AFTER_DAYS = 30;

    public function handle(): int
    {
        $clients = Client::whereNotNull('metricool_blog_id')->get();

        if ($clients->isEmpty()) {
            $this->warn('No hay clientes con metricool_blog_id.');
            return self::SUCCESS;
        }

        $userId = (string) config('metricool.user_id');
        [$rangeStart, $rangeEnd] = [
            now()->subDays(self::AUTO_RESCRAPE_AFTER_DAYS - 1)->toDateString(),
            now()->toDateString(),
        ];

        $this->info("Despachando snapshot diario para {$clients->count()} cliente(s)...");

        foreach ($clients as $client) {
            $networks = $client->metricool_networks ?? self::DEFAULT_NETWORKS;

            SnapshotMetricoolHistory::dispatch(
                $client->id,
                $networks,
                (string) $client->metricool_blog_id,
                $userId,
                $rangeStart,
                $rangeEnd,
            );
        }

        $pruned = MetricoolMetricHistory::pruneOlderThan(120);
        $this->info("Despachado. Filas de historial viejas podadas: {$pruned}.");

        return self::SUCCESS;
    }
}
