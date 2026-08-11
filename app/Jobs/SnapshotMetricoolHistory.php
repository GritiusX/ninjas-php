<?php

namespace App\Jobs;

use App\Models\MetricoolMetricHistory;
use App\Models\MetricoolScrapeCache;
use App\Services\Metricool\MetricoolScraperService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Snapshot diario para un cliente: scrapea sus redes vía Selenium (una sola
 * sesión Chrome, ver MetricoolScraperService::scrapeEvolutions) y guarda el
 * resultado en dos lugares:
 *  - metricool_metric_history: un punto por día, alimenta sparklines/drill-down.
 *  - metricool_scrape_cache: mismo rango "automático" que usa MetricsController,
 *    así de paso se calienta la cache normal y se reduce el scraping on-demand.
 *
 * Despachado por metricool:snapshot-history, uno por cliente, en la misma queue
 * 'scraping' (un solo worker) que ScrapeMetricoolEvolution — así nunca corren
 * dos sesiones de Chrome en simultáneo contra el mismo perfil persistido.
 */
class SnapshotMetricoolHistory implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries   = 1;

    public function __construct(
        private readonly int    $clientId,
        private readonly array  $networks,
        private readonly string $blogId,
        private readonly string $userId,
        private readonly string $defaultRangeStart,
        private readonly string $defaultRangeEnd,
    ) {
        $this->onQueue('scraping');
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SnapshotMetricoolHistory falló definitivamente', [
            'client_id' => $this->clientId,
            'networks'  => $this->networks,
            'error'     => $e->getMessage(),
        ]);
    }

    public function handle(MetricoolScraperService $scraper): void
    {
        $targets = [];
        foreach ($this->networks as $network) {
            $targets[$network] = ['blogId' => $this->blogId, 'userId' => $this->userId];
        }

        if (empty($targets)) {
            return;
        }

        $capturedOn = now()->toDateString();

        $scraper->scrapeEvolutions($targets, null, null, function (string $network, array $result) use ($capturedOn): void {
            MetricoolScrapeCache::store(
                $this->clientId,
                $network,
                $this->defaultRangeStart,
                $this->defaultRangeEnd,
                $result,
            );

            MetricoolMetricHistory::store(
                $this->clientId,
                $network,
                $capturedOn,
                $result,
            );
        });

        Log::info('SnapshotMetricoolHistory completado', [
            'client_id' => $this->clientId,
            'networks'  => array_keys($targets),
        ]);
    }
}
