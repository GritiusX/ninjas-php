<?php

namespace App\Http\Controllers;

use App\Jobs\SyncClientMetricsForMonth;
use App\Models\Client;
use App\Models\MonthlySnapshot;
use App\Services\GoogleAds\GoogleAdsService;
use App\Services\Metricool\KpiCalculator;
use App\Services\Metricool\MetricoolBundleBuilder;
use App\Services\Metricool\MetricoolClient;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class MetricsController extends Controller
{
    public function index(): Response
    {
        $clients = Client::query()
            ->orderBy('name')
            ->get(['id', 'name', 'metricool_blog_id'])
            ->map(function (Client $client) {
                $latest = MonthlySnapshot::where('client_id', $client->id)
                    ->orderByDesc('year')
                    ->orderByDesc('month')
                    ->first();

                return [
                    'id'                 => $client->id,
                    'name'               => $client->name,
                    'metricool_blog_id'  => $client->metricool_blog_id,
                    'has_data'           => (bool) $latest,
                    'last_synced_at'     => $latest?->synced_at?->toIso8601String(),
                ];
            });

        return Inertia::render('metrics/index', [
            'clients' => $clients,
        ]);
    }

    public function show(Request $request, Client $client): Response
    {
        $target = $this->resolveMonth($request);
        $previous = $target->copy()->subMonthNoOverflow();

        $current = $this->snapshotsByArea($client->id, $target->year, $target->month);
        $prev    = $this->snapshotsByArea($client->id, $previous->year, $previous->month);

        $byArea = [];
        foreach (['awareness', 'content', 'community', 'ads', 'system'] as $area) {
            $byArea[$area] = $this->mergeWithPrevious($current[$area] ?? [], $prev[$area] ?? []);
        }

        $availableMonths = MonthlySnapshot::where('client_id', $client->id)
            ->select('year', 'month')
            ->groupBy('year', 'month')
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->get()
            ->map(fn ($row) => sprintf('%04d-%02d', $row->year, $row->month))
            ->values();

        $lastSync = MonthlySnapshot::where('client_id', $client->id)
            ->where('year', $target->year)
            ->where('month', $target->month)
            ->max('synced_at');

        return Inertia::render('metrics/show', [
            'client' => [
                'id'                 => $client->id,
                'name'               => $client->name,
                'metricool_blog_id'  => $client->metricool_blog_id,
            ],
            'period' => [
                'year'       => $target->year,
                'month'      => $target->month,
                'label'      => $target->locale('es')->isoFormat('MMMM YYYY'),
                'last_sync'  => $lastSync,
                'available'  => $availableMonths,
            ],
            'metrics' => $byArea,
        ]);
    }

    public function sync(Request $request, Client $client): RedirectResponse
    {
        if (! $client->metricool_blog_id) {
            return back()->with('error', 'El cliente no tiene blog ID de Metricool configurado.');
        }

        $months = $this->resolveMonthRange($request);

        try {
            if ($request->boolean('inline')) {
                $builder   = app(MetricoolBundleBuilder::class);
                $calculator = app(KpiCalculator::class);
                $googleAds  = app(GoogleAdsService::class);

                foreach ($months as $target) {
                    (new SyncClientMetricsForMonth($client->id, $target->year, $target->month))
                        ->handle($builder, $calculator, $googleAds);
                }

                $count = count($months);
                $message = $count === 1
                    ? 'Sincronización completada.'
                    : "Sincronización completada ({$count} meses).";
            } else {
                foreach ($months as $target) {
                    dispatch(new SyncClientMetricsForMonth($client->id, $target->year, $target->month));
                }
                $message = 'Sincronización encolada. Se actualizará en breve.';
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[MetricsSync] Error al sincronizar', [
                'client_id' => $client->id,
                'error'     => $e->getMessage(),
            ]);
            return back()->with('error', 'Error al sincronizar: ' . $e->getMessage());
        }

        return back()->with('success', $message);
    }

    public function metricoolReportsZipAll(): StreamedResponse
    {
        set_time_limit(180);

        $clients = Client::whereNotNull('metricool_blog_id')->orderBy('name')->get();
        $mc      = app(MetricoolClient::class);

        $tmpFile = tempnam(sys_get_temp_dir(), 'mc_reports_');
        $zip     = new ZipArchive();
        $zip->open($tmpFile, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($clients as $client) {
            $raw   = $mc->listReports($client->metricool_blog_id);
            $items = $raw['data'] ?? (array_is_list($raw) ? $raw : []);

            $report = collect($items)
                ->filter(fn ($r) => ($r['status'] ?? '') === 'FINISHED' && isset($r['reportFile']))
                ->sortByDesc('creationDate')
                ->first();

            if (! $report) {
                continue;
            }

            $statusRaw = $mc->getReportStatus($client->metricool_blog_id, $report['reportFile']);
            $info      = $statusRaw['data'] ?? $statusRaw;
            $path      = $info['reportPath'] ?? null;

            if (! $path) {
                $path = filter_var($report['reportFile'], FILTER_VALIDATE_URL)
                    ? $report['reportFile']
                    : null;
            }

            if (! $path) {
                continue;
            }

            $file = Http::timeout(30)->get($path);
            if (! $file->successful()) {
                continue;
            }

            $ext      = pathinfo(parse_url($path, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'pdf';
            $filename = str($client->name)->slug() . '.' . $ext;
            $zip->addFromString($filename, $file->body());
        }

        $zip->close();

        $zipName = 'reportes-metricool-' . now()->format('Y-m') . '.zip';

        return response()->streamDownload(function () use ($tmpFile) {
            readfile($tmpFile);
            @unlink($tmpFile);
        }, $zipName, ['Content-Type' => 'application/zip']);
    }

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

    /** @return CarbonInterface[] */
    private function resolveMonthRange(Request $request): array
    {
        $start = $this->parseMonth($request->string('start_date')->trim()->value())
            ?? now()->subMonthNoOverflow()->startOfMonth();
        $end   = $this->parseMonth($request->string('end_date')->trim()->value()) ?? $start;

        if ($end->lt($start)) {
            $end = $start;
        }

        $months = [];
        $cursor = $start->copy()->startOfMonth();
        while ($cursor->lte($end)) {
            $months[] = $cursor->copy();
            $cursor->addMonthNoOverflow();
        }

        return $months;
    }

    private function resolveMonth(Request $request): CarbonInterface
    {
        return $this->parseMonth($request->string('period')->trim()->value())
            ?? now()->subMonthNoOverflow()->startOfMonth();
    }

    private function parseMonth(string $value): ?CarbonInterface
    {
        if ($value && preg_match('/^(\d{4})-(\d{1,2})$/', $value, $m)) {
            return Carbon::create((int) $m[1], (int) $m[2], 1);
        }
        return null;
    }

    private function snapshotsByArea(int $clientId, int $year, int $month): array
    {
        return MonthlySnapshot::where('client_id', $clientId)
            ->where('year', $year)
            ->where('month', $month)
            ->get(['area', 'metric_key', 'value'])
            ->groupBy('area')
            ->map(fn ($group) => $group->map(fn ($s) => [
                'metric_key' => $s->metric_key,
                'value'      => $s->value !== null ? (float) $s->value : null,
            ])->keyBy('metric_key')->toArray())
            ->toArray();
    }

    private function mergeWithPrevious(array $current, array $previous): array
    {
        $rows = [];
        foreach ($current as $key => $row) {
            $value = $row['value'];
            $prev  = $previous[$key]['value'] ?? null;

            $deltaPct = null;
            if ($value !== null && $prev !== null && $prev != 0) {
                $deltaPct = (($value - $prev) / abs($prev)) * 100;
            }

            $rows[] = [
                'metric_key' => $key,
                'value'      => $value,
                'previous'   => $prev,
                'delta_pct'  => $deltaPct,
            ];
        }

        return $rows;
    }
}
