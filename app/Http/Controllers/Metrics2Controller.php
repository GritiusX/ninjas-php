<?php

namespace App\Http\Controllers;

use App\Jobs\ScrapeMetricoolEvolution;
use App\Models\Client;
use App\Models\MetricoolScrapeCache;
use App\Services\Metricool\MetricoolScraperService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
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
                    'id'            => $client->id,
                    'name'          => $client->name,
                    'networks'      => $networks,
                    'cachedCount'   => $cachedCount,
                    'totalNetworks' => count($networks),
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
        $networks = $client->metricool_networks ?? self::DEFAULT_NETWORKS;
        $blogId   = (string) $client->metricool_blog_id;
        $userId   = (string) config('metricool.user_id');

        if ($request->boolean('force')) {
            MetricoolScrapeCache::where('client_id', $client->id)
                ->where('range_start', self::RANGE_START)
                ->where('range_end', self::RANGE_END)
                ->delete();
        }

        $networkResults = $this->buildNetworkResults($client->id, $networks);
        $missing        = array_keys(array_filter($networkResults, fn ($r) => $r['pending']));

        if (!empty($missing)) {
            ScrapeMetricoolEvolution::dispatch(
                $client->id,
                $missing,
                $blogId,
                $userId,
                self::RANGE_START,
                self::RANGE_END,
            );
        }

        return Inertia::render('metrics2/show', [
            'client'         => ['id' => $client->id, 'name' => $client->name],
            'networkResults' => $networkResults,
            'start'          => self::RANGE_START,
            'end'            => self::RANGE_END,
        ]);
    }

    public function status(Client $client): JsonResponse
    {
        $networks = $client->metricool_networks ?? self::DEFAULT_NETWORKS;

        return response()->json([
            'networkResults' => $this->buildNetworkResults($client->id, $networks),
        ]);
    }

    // -------------------------------------------------------------------------

    private function buildNetworkResults(int $clientId, array $networks): array
    {
        $results = [];
        foreach ($networks as $network) {
            $cached = MetricoolScrapeCache::findCached($clientId, $network, self::RANGE_START, self::RANGE_END);

            if ($cached === null) {
                $results[$network] = ['data' => null, 'fromCache' => false, 'error' => null, 'pending' => true];
                continue;
            }

            $data  = $cached->data;
            $error = $data['_error'] ?? null;

            $results[$network] = [
                'data'      => $error ? null : $data,
                'fromCache' => true,
                'error'     => $error,
                'pending'   => false,
            ];
        }
        return $results;
    }
}
