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
    private const DEFAULT_NETWORKS = ['facebook', 'instagram'];

    public function __construct(private readonly MetricoolScraperService $scraper)
    {
    }

    public function list(Request $request): Response
    {
        [$start, $end] = $this->resolveRange($request);

        $clients = Client::whereNotNull('metricool_blog_id')
            ->orderBy('name')
            ->get(['id', 'name', 'metricool_networks'])
            ->map(function (Client $client) use ($start, $end) {
                $networks    = $client->metricool_networks ?? self::DEFAULT_NETWORKS;
                $cachedCount = MetricoolScrapeCache::where('client_id', $client->id)
                    ->where('range_start', $start)
                    ->where('range_end', $end)
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
            'start'   => $start,
            'end'     => $end,
        ]);
    }

    public function show(Request $request, Client $client): Response
    {
        [$start, $end] = $this->resolveRange($request);

        $networks = $client->metricool_networks ?? self::DEFAULT_NETWORKS;
        $blogId   = (string) $client->metricool_blog_id;
        $userId   = (string) config('metricool.user_id');

        if ($request->boolean('force')) {
            MetricoolScrapeCache::where('client_id', $client->id)
                ->where('range_start', $start)
                ->where('range_end', $end)
                ->delete();

            // Por si el chrome-profile quedó con locks de una corrida anterior
            // que no cerró limpio (job matado, timeout, deploy): sin esto, el
            // próximo intento de Selenium falla siempre igual, no solo a veces.
            $this->killStrayChromeProcesses();
        }

        $networkResults = $this->buildNetworkResults($client->id, $networks, $start, $end);
        $missing        = array_keys(array_filter($networkResults, fn ($r) => $r['pending']));

        if (!empty($missing)) {
            ScrapeMetricoolEvolution::dispatch(
                $client->id,
                $missing,
                $blogId,
                $userId,
                $start,
                $end,
            );
        }

        return Inertia::render('metrics2/show', [
            'client'         => ['id' => $client->id, 'name' => $client->name],
            'networkResults' => $networkResults,
            'start'          => $start,
            'end'            => $end,
        ]);
    }

    public function cancel(): JsonResponse
    {
        $this->killStrayChromeProcesses();
        return response()->json(['ok' => true]);
    }

    public function status(Request $request, Client $client): JsonResponse
    {
        [$start, $end] = $this->resolveRange($request);
        $networks = $client->metricool_networks ?? self::DEFAULT_NETWORKS;

        return response()->json([
            'networkResults' => $this->buildNetworkResults($client->id, $networks, $start, $end),
        ]);
    }

    // -------------------------------------------------------------------------

    /**
     * Mata procesos de Chrome/chromedriver colgados y borra los locks del
     * perfil persistido (storage/app/private/chrome-profile). Sin esto, un
     * Chrome que quedó huérfano (job matado, timeout, deploy) hace que TODO
     * intento futuro de Selenium falle con "session not created: Chrome
     * instance exited", siempre, no solo a veces.
     */
    private function killStrayChromeProcesses(): void
    {
        exec('pkill -f chromedriver 2>/dev/null');
        exec('pkill -f "chrome --" 2>/dev/null');

        $profileDir = storage_path('app/private/chrome-profile');
        foreach (['SingletonLock', 'SingletonCookie', 'SingletonSocket'] as $lockFile) {
            $path = $profileDir . DIRECTORY_SEPARATOR . $lockFile;
            if (file_exists($path) || is_link($path)) {
                @unlink($path);
            }
        }
    }

    /**
     * Lee 'start'/'end' de la query string (formato Y-m-d, start <= end).
     * Si faltan o son inválidos, usa como default los últimos 30 días.
     *
     * @return array{0: string, 1: string}
     */
    private function resolveRange(Request $request): array
    {
        $start = $request->query('start');
        $end   = $request->query('end');

        if (is_string($start) && is_string($end)) {
            try {
                $startDate = Carbon::parse($start)->startOfDay();
                $endDate   = Carbon::parse($end)->startOfDay();

                if ($startDate->lte($endDate)) {
                    return [$startDate->toDateString(), $endDate->toDateString()];
                }
            } catch (\Exception) {
                // rango inválido, cae al default
            }
        }

        return [now()->subDays(29)->toDateString(), now()->toDateString()];
    }

    private function buildNetworkResults(int $clientId, array $networks, string $start, string $end): array
    {
        $results = [];
        foreach ($networks as $network) {
            $cached = MetricoolScrapeCache::findCached($clientId, $network, $start, $end);

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
