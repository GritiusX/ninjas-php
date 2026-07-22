<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\MetricoolScrapeCache;
use App\Services\Metricool\MetricoolScraperService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class Metrics2Controller extends Controller
{
    private const RANGE_START = '2026-06-20';
    private const RANGE_END   = '2026-07-19';

    // blogId de Instagram de Aura Natural en Metricool (distinto al de Facebook).
    // TODO: guardar como columna metricool_ig_blog_id en clients cuando se extienda a otros clientes.
    private const AURA_NATURAL_IG_BLOG_ID = '5580785';

    public function __construct(private readonly MetricoolScraperService $scraper)
    {
    }

    public function index(Request $request)
    {
        $client = Client::where('name', 'Aura Natural')->firstOrFail();
        $userId = (string) config('metricool.user_id');
        $start  = Carbon::parse(self::RANGE_START)->startOfDay();
        $end    = Carbon::parse(self::RANGE_END)->endOfDay();

        // ?force=1 invalida el cache de ambas redes para este rango y vuelve a scrapearlo.
        if ($request->boolean('force')) {
            MetricoolScrapeCache::where('client_id', $client->id)
                ->where('range_start', self::RANGE_START)
                ->where('range_end', self::RANGE_END)
                ->delete();
        }

        $fbCached = MetricoolScrapeCache::findCached($client->id, 'facebook', self::RANGE_START, self::RANGE_END);
        $igCached = MetricoolScrapeCache::findCached($client->id, 'instagram', self::RANGE_START, self::RANGE_END);

        $fbData      = $fbCached?->data;
        $fbFromCache = $fbCached !== null;
        $igData      = $igCached?->data;
        $igFromCache = $igCached !== null;
        $fbError     = null;
        $igError     = null;

        // Solo abre Chrome si falta al menos una de las dos redes en cache.
        $missing = [];
        if (!$fbCached) {
            $missing['facebook'] = ['blogId' => (string) $client->metricool_blog_id, 'userId' => $userId];
        }
        if (!$igCached) {
            $missing['instagram'] = ['blogId' => self::AURA_NATURAL_IG_BLOG_ID, 'userId' => $userId];
        }

        if (!empty($missing)) {
            $scraped = $this->scraper->scrapeEvolutions($missing, $start, $end);

            foreach ($scraped as $network => $result) {
                $error = $result['_error'] ?? null;

                if ($error) {
                    match ($network) {
                        'facebook'  => $fbError = $error,
                        'instagram' => $igError = $error,
                        default     => null,
                    };
                    continue;
                }

                MetricoolScrapeCache::store($client->id, $network, self::RANGE_START, self::RANGE_END, $result);

                match ($network) {
                    'facebook'  => [$fbData, $fbFromCache] = [$result, false],
                    'instagram' => [$igData, $igFromCache] = [$result, false],
                    default     => null,
                };
            }
        }

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
}
