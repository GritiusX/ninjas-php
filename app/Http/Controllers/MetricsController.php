<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateMetricoolReport;
use App\Jobs\ScrapeMetricoolEvolution;
use App\Models\Client;
use App\Models\MetricoolMetricHistory;
use App\Models\MetricoolScrapeCache;
use App\Services\Metricool\MetricoolClient;
use App\Services\Metricool\MetricoolScraperService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MetricsController extends Controller
{
    private const DEFAULT_NETWORKS = ['facebook', 'instagram'];

    // Si ya hay un scrape de los últimos N días para un cliente/red, no se
    // vuelve a disparar automáticamente hasta que pasen esos N días.
    private const AUTO_RESCRAPE_AFTER_DAYS = 30;

    public function __construct(private readonly MetricoolScraperService $scraper)
    {
    }

    public function list(): Response
    {
        [$start, $end] = $this->defaultRange();

        $clients = Client::whereNotNull('metricool_blog_id')
            ->orderBy('name')
            ->get(['id', 'name', 'metricool_networks'])
            ->map(function (Client $client) use ($start, $end) {
                $networks    = $client->metricool_networks ?? self::DEFAULT_NETWORKS;
                $cachedCount = collect($networks)
                    ->filter(fn (string $network) => $this->findFreshCache($client->id, $network, $start, $end, isDefault: true) !== null)
                    ->count();

                return [
                    'id'            => $client->id,
                    'name'          => $client->name,
                    'networks'      => $networks,
                    'cachedCount'   => $cachedCount,
                    'totalNetworks' => count($networks),
                ];
            });

        return Inertia::render('metrics/index', [
            'clients' => $clients,
        ]);
    }

    public function show(Request $request, Client $client): Response
    {
        [$start, $end] = $this->resolveRange($request);
        $isDefault = [$start, $end] === $this->defaultRange();

        $networks = $client->metricool_networks ?? self::DEFAULT_NETWORKS;
        $blogId   = (string) $client->metricool_blog_id;
        $userId   = (string) config('metricool.user_id');

        if ($request->boolean('force')) {
            // Borramos TODO el cache de este cliente (no solo el rango exacto)
            // para que ningún registro "reciente" de otro rango tape el refresh
            // forzado vía el fallback de abajo.
            MetricoolScrapeCache::where('client_id', $client->id)->delete();

            // Por si el chrome-profile quedó con locks de una corrida anterior
            // que no cerró limpio (job matado, timeout, deploy): sin esto, el
            // próximo intento de Selenium falla siempre igual, no solo a veces.
            $this->killStrayChromeProcesses();
        }

        $networkResults = $this->buildNetworkResults($client->id, $networks, $start, $end, $isDefault);
        $missing        = array_keys(array_filter($networkResults, fn ($r) => $r['pending']));

        if (!empty($missing)) {
            ScrapeMetricoolEvolution::dispatch(
                $client->id,
                $missing,
                $blogId,
                $userId,
                $start,
                $end,
                forceDateRange: !$isDefault,
            );
        }

        return Inertia::render('metrics/show', [
            'client'         => ['id' => $client->id, 'name' => $client->name],
            'networkResults' => $networkResults,
            'start'          => $start,
            'end'            => $end,
            'isDefault'      => $isDefault,
            'history'        => $this->buildHistory($client->id, $networks),
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
        $isDefault = [$start, $end] === $this->defaultRange();
        $networks  = $client->metricool_networks ?? self::DEFAULT_NETWORKS;

        return response()->json([
            'networkResults' => $this->buildNetworkResults($client->id, $networks, $start, $end, $isDefault),
        ]);
    }

    // -------------------------------------------------------------------------
    // Reportes PDF de Metricool (API oficial, independiente del scraper) —
    // portado de la vieja MetricsController.
    // -------------------------------------------------------------------------

    public function metricoolReports(Client $client): JsonResponse
    {
        if (! $client->metricool_blog_id) {
            return response()->json(['error' => 'Sin blog ID configurado.'], 422);
        }

        $raw = app(MetricoolClient::class)->listReports($client->metricool_blog_id);
        $items = $raw['data'] ?? (array_is_list($raw) ? $raw : []);

        $reports = collect($items)
            ->filter(fn ($r) => ($r['status'] ?? '') === 'FINISHED' && isset($r['reportFile']))
            ->map(fn ($r) => [
                'jobId'        => $r['reportFile'],
                'from'         => $r['from'] ?? null,
                'to'           => $r['to']   ?? null,
                'reportType'   => $r['reportType'] ?? null,
                'creationDate' => $r['creationDate'] ?? null,
            ])
            ->sortByDesc('creationDate')
            ->values();

        return response()->json($reports);
    }

    public function metricoolReportCreate(Request $request, Client $client): JsonResponse
    {
        if (! $client->metricool_blog_id) {
            return response()->json(['error' => 'Sin blog ID configurado.'], 422);
        }

        $target = $this->resolveMonth($request);
        $start  = $target->copy()->startOfMonth();
        $end    = $target->copy()->endOfMonth();

        dispatch(new GenerateMetricoolReport(
            blogId:    $client->metricool_blog_id,
            startDate: $start->format('Ymd'),
            endDate:   $end->format('Ymd'),
        ));

        return response()->json(['queued' => true, 'period' => $target->format('Y-m')]);
    }

    public function metricoolReportDownload(Request $request, Client $client): \Symfony\Component\HttpFoundation\Response
    {
        if (! $client->metricool_blog_id) {
            abort(422, 'Sin blog ID configurado.');
        }

        $jobId = $request->string('jobId')->trim()->value();
        if (! $jobId) {
            abort(400, 'Falta jobId.');
        }

        $raw = app(MetricoolClient::class)->getReportStatus($client->metricool_blog_id, $jobId);
        $info = $raw['data'] ?? $raw;

        $path = $info['reportPath'] ?? null;
        if (! $path) {
            // fallback: maybe jobId itself is a full URL (some API versions return it directly)
            $path = filter_var($jobId, FILTER_VALIDATE_URL) ? $jobId : null;
        }

        if (! $path) {
            abort(404, 'Reporte no disponible.');
        }

        return redirect()->away($path);
    }

    private function resolveMonth(Request $request): Carbon
    {
        $value = $request->string('period')->trim()->value();

        if ($value && preg_match('/^(\d{4})-(\d{1,2})$/', $value, $m)) {
            return Carbon::create((int) $m[1], (int) $m[2], 1);
        }

        return now()->subMonthNoOverflow()->startOfMonth();
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

        // Dar un momento para que los procesos terminen y luego reiniciar
        usleep(500_000);
        exec('nohup chromedriver --port=9515 --allowed-ips= --allowed-origins=* > /dev/null 2>&1 &');
    }

    /**
     * Rango "automático": últimos AUTO_RESCRAPE_AFTER_DAYS días terminando hoy.
     * Se recalcula en cada request — por diseño se corre un día cada día, por
     * eso NO se usa para matchear cache exacto (ver findFreshCache).
     *
     * @return array{0: string, 1: string}
     */
    private function defaultRange(): array
    {
        return [now()->subDays(self::AUTO_RESCRAPE_AFTER_DAYS - 1)->toDateString(), now()->toDateString()];
    }

    /**
     * Lee 'start'/'end' de la query string (formato Y-m-d, start <= end).
     * Si faltan o son inválidos, cae al rango automático.
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

        return $this->defaultRange();
    }

    /**
     * Busca cache para client_id/network. Si $isDefault es true (el usuario no
     * eligió un rango custom) y no hay match exacto para $start/$end, cae a
     * "cualquier scrape de los últimos AUTO_RESCRAPE_AFTER_DAYS días" en vez de
     * exigir que coincida el rango exacto — así no se re-scrapea todos los días
     * solo porque el rango automático se corrió un día. Si el usuario eligió un
     * rango custom ($isDefault = false), se exige coincidencia exacta: no
     * queremos mostrar datos de otro período distinto al que pidió.
     */
    private function findFreshCache(int $clientId, string $network, string $start, string $end, bool $isDefault): ?MetricoolScrapeCache
    {
        $cached = MetricoolScrapeCache::findCached($clientId, $network, $start, $end);

        if ($cached === null && $isDefault) {
            $cached = MetricoolScrapeCache::findRecent($clientId, $network, self::AUTO_RESCRAPE_AFTER_DAYS);
        }

        return $cached;
    }

    private function buildNetworkResults(int $clientId, array $networks, string $start, string $end, bool $isDefault): array
    {
        $results = [];
        foreach ($networks as $network) {
            $cached = $this->findFreshCache($clientId, $network, $start, $end, $isDefault);

            if ($cached === null) {
                $results[$network] = [
                    'data'       => null,
                    'fromCache'  => false,
                    'error'      => null,
                    'pending'    => true,
                    'rangeStart' => null,
                    'rangeEnd'   => null,
                ];
                continue;
            }

            $data  = $cached->data;
            $error = $data['_error'] ?? null;

            $results[$network] = [
                'data'       => $error ? null : $data,
                'fromCache'  => true,
                'error'      => $error,
                'pending'    => false,
                'rangeStart' => $cached->range_start->toDateString(),
                'rangeEnd'   => $cached->range_end->toDateString(),
            ];
        }
        return $results;
    }

    /**
     * Últimos AUTO_RESCRAPE_AFTER_DAYS snapshots diarios por red, para que el
     * frontend arme sparklines y el drill-down de evolución. Se carga solo en
     * show() (no en status(), que hace polling cada 3s mientras hay redes
     * pendientes) porque el historial no cambia entre snapshots diarios.
     */
    private function buildHistory(int $clientId, array $networks): array
    {
        $history = [];
        foreach ($networks as $network) {
            $history[$network] = MetricoolMetricHistory::recentFor($clientId, $network, self::AUTO_RESCRAPE_AFTER_DAYS)
                ->map(fn ($row) => [
                    'date' => $row->captured_on->toDateString(),
                    'data' => $row->data,
                ])
                ->values();
        }
        return $history;
    }
}
