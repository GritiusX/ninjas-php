<?php

namespace App\Jobs;

use App\Models\MetricoolScrapeCache;
use App\Services\Metricool\MetricoolScraperService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ScrapeMetricoolEvolution implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // Hasta 10 minutos por job (Chrome puede tardar bastante con 5 redes)
    public int $timeout = 600;
    public int $tries   = 1;

    public function __construct(
        private readonly int    $clientId,
        private readonly array  $networks,
        private readonly string $blogId,
        private readonly string $userId,
        private readonly string $rangeStart,
        private readonly string $rangeEnd,
    ) {
        // Queue dedicada con 1 worker para evitar conflictos de puerto de Chrome
        $this->onQueue('scraping');
    }

    public function failed(\Throwable $e): void
    {
        Log::error('ScrapeMetricoolEvolution falló definitivamente', [
            'client_id' => $this->clientId,
            'networks'  => $this->networks,
            'error'     => $e->getMessage(),
        ]);

        // Guardar error en cache para que el polling del frontend lo detecte
        // en lugar de quedar girando infinitamente.
        foreach ($this->networks as $network) {
            if (!MetricoolScrapeCache::findCached($this->clientId, $network, $this->rangeStart, $this->rangeEnd)) {
                MetricoolScrapeCache::store(
                    $this->clientId,
                    $network,
                    $this->rangeStart,
                    $this->rangeEnd,
                    ['_error' => 'El scraping falló o tardó demasiado. Intentá de nuevo.'],
                );
            }
        }
    }

    public function handle(MetricoolScraperService $scraper): void
    {
        // Solo scrapeamos redes que siguen sin cache (puede que ya llegaron de otro job)
        $targets = [];
        foreach ($this->networks as $network) {
            if (!MetricoolScrapeCache::findCached($this->clientId, $network, $this->rangeStart, $this->rangeEnd)) {
                $targets[$network] = ['blogId' => $this->blogId, 'userId' => $this->userId];
            }
        }

        if (empty($targets)) {
            return;
        }

        $start   = Carbon::parse($this->rangeStart)->startOfDay();
        $end     = Carbon::parse($this->rangeEnd)->endOfDay();
        $results = $scraper->scrapeEvolutions($targets, $start, $end);

        foreach ($results as $network => $result) {
            MetricoolScrapeCache::store(
                $this->clientId,
                $network,
                $this->rangeStart,
                $this->rangeEnd,
                $result,   // guarda incluso si tiene _error, para que el status endpoint lo detecte
            );
        }

        Log::info('ScrapeMetricoolEvolution completado', [
            'client_id' => $this->clientId,
            'networks'  => array_keys($results),
        ]);
    }
}
