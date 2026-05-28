<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\MonthlySnapshot;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;

class MetricsPdfController extends Controller
{
    public function download(Request $request, Client $client): Response
    {
        $period = $request->string('period')->trim()->value();

        if ($period && preg_match('/^(\d{4})-(\d{1,2})$/', $period, $m)) {
            $target = Carbon::create((int) $m[1], (int) $m[2], 1);
        } else {
            $target = now()->subMonthNoOverflow()->startOfMonth();
        }

        $year  = $target->year;
        $month = $target->month;

        $previous = $target->copy()->subMonthNoOverflow();

        $current  = $this->snapshotsByArea($client->id, $year, $month);
        $prev     = $this->snapshotsByArea($client->id, $previous->year, $previous->month);

        $byArea = [];
        foreach (['awareness', 'content', 'community', 'ads', 'system'] as $area) {
            $byArea[$area] = $this->mergeWithPrevious($current[$area] ?? [], $prev[$area] ?? []);
        }

        $pdf = Pdf::loadView('pdf.metrics', [
            'client'  => $client,
            'year'    => $year,
            'month'   => $month,
            'label'   => $target->locale('es')->isoFormat('MMMM YYYY'),
            'metrics' => $byArea,
        ])->setPaper('a4', 'portrait');

        $filename = 'reporte-' . str($client->name)->slug() . '-' . $year . '-' . str_pad($month, 2, '0', STR_PAD_LEFT) . '.pdf';

        return $pdf->download($filename);
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
            $value    = $row['value'];
            $prev     = $previous[$key]['value'] ?? null;
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
