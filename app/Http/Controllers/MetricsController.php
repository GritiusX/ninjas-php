<?php

namespace App\Http\Controllers;

use App\Jobs\SyncClientMetricsForMonth;
use App\Models\Client;
use App\Models\MonthlySnapshot;
use App\Services\GoogleAds\GoogleAdsService;
use App\Services\Metricool\KpiCalculator;
use App\Services\Metricool\MetricoolBundleBuilder;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        $previous = $target->subMonthNoOverflow();

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

        $target = $this->resolveMonth($request);

        try {
            if ($request->boolean('inline')) {
                (new SyncClientMetricsForMonth($client->id, $target->year, $target->month))
                    ->handle(app(MetricoolBundleBuilder::class), app(KpiCalculator::class), app(GoogleAdsService::class));
                $message = 'Sincronización completada.';
            } else {
                dispatch(new SyncClientMetricsForMonth($client->id, $target->year, $target->month));
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

    private function resolveMonth(Request $request): CarbonInterface
    {
        $period = $request->string('period')->trim()->value();

        if ($period && preg_match('/^(\d{4})-(\d{1,2})$/', $period, $m)) {
            return Carbon::create((int) $m[1], (int) $m[2], 1);
        }

        return now()->subMonthNoOverflow()->startOfMonth();
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
