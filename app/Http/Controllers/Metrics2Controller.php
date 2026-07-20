<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Services\Metricool\MetricoolScraperService;
use Carbon\Carbon;
use Throwable;

class Metrics2Controller extends Controller
{
    // Rango fijo solo para esta prueba — se reemplaza por el rango real al portar a /metrics.
    private const RANGE_START = '2026-06-20';
    private const RANGE_END   = '2026-07-19';

    public function __construct(private readonly MetricoolScraperService $scraper)
    {
    }

    public function index()
    {
        $client = Client::where('name', 'Aura Natural')->firstOrFail();
        $userId = (string) config('metricool.user_id');
        $start  = Carbon::parse(self::RANGE_START)->startOfDay();
        $end    = Carbon::parse(self::RANGE_END)->endOfDay();

        $data  = null;
        $error = null;

        try {
            $data = $this->scraper->facebookEvolution((string) $client->metricool_blog_id, $userId, $start, $end);
        } catch (Throwable $e) {
            $error = $e->getMessage();
        }

        return view('metrics2', [
            'client' => $client,
            'data'   => $data,
            'error'  => $error,
        ]);
    }
}
