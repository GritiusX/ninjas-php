<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdsController extends Controller
{
    public function index(Request $request): Response
    {
        $dateFrom = $request->date('from', 'Y-m-d') ?? now()->subDays(6)->toDateString();
        $dateTo = $request->date('to', 'Y-m-d') ?? now()->toDateString();

        $metrics = DB::table('clients as c')
            ->leftJoin('ad_metrics as am', function ($join) use ($dateFrom, $dateTo) {
                $join->on('am.client_id', '=', 'c.id')
                    ->whereBetween('am.date', [$dateFrom, $dateTo]);
            })
            ->select([
                'c.id',
                'c.name',
                'c.roas_goal',
                DB::raw('COALESCE(SUM(am.investment), 0) as total_investment'),
                DB::raw('COALESCE(SUM(am.revenue), 0) as total_revenue'),
                DB::raw('COALESCE(SUM(am.transactions), 0) as total_transactions'),
                DB::raw('ROUND(COALESCE(SUM(am.revenue), 0) / NULLIF(COALESCE(SUM(am.investment), 0), 0), 2) as roas_periodo'),
            ])
            ->groupBy('c.id', 'c.name', 'c.roas_goal')
            ->orderBy('c.name')
            ->get()
            ->map(function ($row) {
                $roas = (float) $row->roas_periodo;
                $goal = (float) $row->roas_goal;

                $row->roas_periodo = $roas;
                $row->roas_goal    = $goal;

                $row->semaforo = match (true) {
                    $roas >= $goal          => 'green',
                    $roas >= $goal * 0.8    => 'yellow',
                    default                 => 'red',
                };

                return $row;
            });

        return Inertia::render('metrics/index', [
            'metrics' => $metrics,
            'filters' => ['from' => $dateFrom, 'to' => $dateTo],
        ]);
    }
}
