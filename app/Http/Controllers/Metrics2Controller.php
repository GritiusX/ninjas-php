<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\MetricoolScrapeCache;
use App\Services\Metricool\MetricoolScraperService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class Metrics2Controller extends Controller
{
    private const RANGE_START = '2026-06-20';
    private const RANGE_END   = '2026-07-19';

    private const DEFAULT_NETWORKS = ['facebook', 'instagram'];

    public function __construct(private readonly MetricoolScraperService $scraper)
    {
    }

    public function list(): Response
    {
        $clients = Client::whereNotNull('metricool_blog_id')
            ->orderBy('name')
            ->get(['id', 'name', 'metricool_networks'])
            ->map(function (Client $client) {
                $networks    = $client->metricool_networks ?? self::DEFAULT_NETWORKS;
                $cachedCount = MetricoolScrapeCache::where('client_id', $client->id)
                    ->where('range_start', self::RANGE_START)
                    ->where('range_end', self::RANGE_END)
                    ->whereIn('network', $networks)
                    ->count();

                return [
                    'id'             => $client->id,
                    'name'           => $client->name,
                    'networks'       => $networks,
                    'cachedCount'    => $cachedCount,
                    'totalNetworks'  => count($networks),
                ];
            });

        return Inertia::render('metrics2/index', [
            'clients' => $clients,
            'start'   => self::RANGE_START,
            'end'     => self::RANGE_END,
        ]);
    }

    public function show(Request $request, Client $client): Response
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

        $networkResults = [];
        foreach ($networks as $network) {
            $cached = MetricoolScrapeCache::findCached($client->id, $network, self::RANGE_START, self::RANGE_END);
            $networkResults[$network] = [
                'data'      => $cached?->data,
                'fromCache' => $cached !== null,
                'error'     => null,
            ];
        }

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

        return Inertia::render('metrics2/show', [
            'client'         => ['id' => $client->id, 'name' => $client->name],
            'networkResults' => $networkResults,
            'start'          => self::RANGE_START,
            'end'            => self::RANGE_END,
        ]);
    }
}
