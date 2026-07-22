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

    private const DEFAULT_NETWORKS = ['facebook', 'instagram'];

    public function __construct(private readonly MetricoolScraperService $scraper)
    {
    }

    public function index(Request $request, Client $client)
    {
        $userId   = (string) config('metricool.user_id');
        $start    = Carbon::parse(self::RANGE_START)->startOfDay();
        $end      = Carbon::parse(self::RANGE_END)->endOfDay();
        $networks = $client->metricool_networks ?? self::DEFAULT_NETWORKS;
        $blogId   = (string) $client->metricool_blog_id;

        if ($request->boolean('force')) {
            MetricoolScrapeCache::where('client_id', $client->id)
                ->where('range_start', self::RANGE_START)
                ->where('range_end', self::RANGE_END)
                ->delete();
        }

        // Leer cache para cada red
        $networkResults = [];
        foreach ($networks as $network) {
            $cached = MetricoolScrapeCache::findCached($client->id, $network, self::RANGE_START, self::RANGE_END);
            $networkResults[$network] = [
                'data'      => $cached?->data,
                'fromCache' => $cached !== null,
                'error'     => null,
            ];
        }

        // Abrir Chrome solo si hay redes sin cache
        $missing = [];
        foreach ($networks as $network) {
            if ($networkResults[$network]['data'] === null) {
                $missing[$network] = ['blogId' => $blogId, 'userId' => $userId];
            }
        }

        if (!empty($missing)) {
            $scraped = $this->scraper->scrapeEvolutions($missing, $start, $end);

            foreach ($scraped as $network => $result) {
                $error = $result['_error'] ?? null;

                if ($error) {
                    $networkResults[$network]['error'] = $error;
                    continue;
                }

                MetricoolScrapeCache::store($client->id, $network, self::RANGE_START, self::RANGE_END, $result);
                $networkResults[$network]['data']      = $result;
                $networkResults[$network]['fromCache'] = false;
            }
        }

        return view('metrics2', [
            'client'         => $client,
            'networkResults' => $networkResults,
            'start'          => self::RANGE_START,
            'end'            => self::RANGE_END,
        ]);
    }
}
