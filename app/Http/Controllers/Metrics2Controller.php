<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\MetricoolScrapeCache;
use App\Services\Metricool\MetricoolScraperService;
use Carbon\Carbon;
use Throwable;

class Metrics2Controller extends Controller
{
    // Rango fijo solo para esta prueba — se reemplaza por el rango real al portar a /metrics.
    private const RANGE_START = '2026-06-20';
    private const RANGE_END   = '2026-07-19';

    // blogId de Instagram de Aura Natural en Metricool (distinto al de Facebook).
    // TODO: guardar como columna metricool_ig_blog_id en clients cuando se extienda a otros clientes.
    private const AURA_NATURAL_IG_BLOG_ID = '5580785';

    public function __construct(private readonly MetricoolScraperService $scraper)
    {
    }

    public function index(\Illuminate\Http\Request $request)
    {
        $client = Client::where('name', 'Aura Natural')->firstOrFail();
        $userId = (string) config('metricool.user_id');
        $start  = Carbon::parse(self::RANGE_START)->startOfDay();
        $end    = Carbon::parse(self::RANGE_END)->endOfDay();

        // ?force=1 borra el cache de ambas redes para este rango y vuelve a scrapearlo.
        if ($request->boolean('force')) {
            MetricoolScrapeCache::where('client_id', $client->id)
                ->where('range_start', self::RANGE_START)
                ->where('range_end', self::RANGE_END)
                ->delete();
        }

        [$fbData, $fbError, $fbFromCache] = $this->resolve(
            clientId:  $client->id,
            network:   'facebook',
            blogId:    (string) $client->metricool_blog_id,
            userId:    $userId,
            start:     $start,
            end:       $end,
            scrape:    fn () => $this->scraper->facebookEvolution(
                (string) $client->metricool_blog_id, $userId, $start, $end
            ),
        );

        [$igData, $igError, $igFromCache] = $this->resolve(
            clientId:  $client->id,
            network:   'instagram',
            blogId:    self::AURA_NATURAL_IG_BLOG_ID,
            userId:    $userId,
            start:     $start,
            end:       $end,
            scrape:    fn () => $this->scraper->instagramEvolution(
                self::AURA_NATURAL_IG_BLOG_ID, $userId, $start, $end
            ),
        );

        return view('metrics2', [
            'client'      => $client,
            'fbData'      => $fbData,
            'fbError'     => $fbError,
            'fbFromCache' => $fbFromCache,
            'igData'      => $igData,
            'igError'     => $igError,
            'igFromCache' => $igFromCache,
            'start'       => self::RANGE_START,
            'end'         => self::RANGE_END,
        ]);
    }

    /**
     * Checks the DB cache first; only runs $scrape() if no cached result exists for this
     * client + network + date range combination. Saves the result on a fresh scrape.
     *
     * @return array{0: array|null, 1: string|null, 2: bool}  [data, error, fromCache]
     */
    private function resolve(
        int $clientId,
        string $network,
        string $blogId,
        string $userId,
        Carbon $start,
        Carbon $end,
        \Closure $scrape,
    ): array {
        $startStr = self::RANGE_START;
        $endStr   = self::RANGE_END;

        $cached = MetricoolScrapeCache::findCached($clientId, $network, $startStr, $endStr);

        if ($cached !== null) {
            return [$cached->data, null, true];
        }

        try {
            $data = $scrape();
            MetricoolScrapeCache::store($clientId, $network, $startStr, $endStr, $data);
            return [$data, null, false];
        } catch (Throwable $e) {
            return [null, $e->getMessage(), false];
        }
    }
}
