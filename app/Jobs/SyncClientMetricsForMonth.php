<?php

namespace App\Jobs;

use App\Models\Client;
use App\Models\MonthlySnapshot;
use App\Services\GoogleAds\GoogleAdsService;
use App\Services\Metricool\KpiCalculator;
use App\Services\Metricool\MetricoolBundleBuilder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Log;

class SyncClientMetricsForMonth implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries = 2;

    public function __construct(
        public int $clientId,
        public int $year,
        public int $month,
    ) {
    }

    public function handle(MetricoolBundleBuilder $builder, KpiCalculator $calculator, GoogleAdsService $googleAds): void
    {
        $client = Client::find($this->clientId);
        if (! $client || ! $client->metricool_blog_id) {
            Log::info('SyncClientMetricsForMonth skipped (no client / no blog id)', [
                'client_id' => $this->clientId,
            ]);
            return;
        }

        $start = Date::create($this->year, $this->month, 1)->startOfMonth();
        $end   = Date::create($this->year, $this->month, 1)->endOfMonth();

        $bundle = $builder->build(
            (string) $client->metricool_blog_id,
            $start,
            $end,
        );

        if ($client->google_ads_customer_id) {
            $result = $googleAds->getMonthlyMetrics(
                $client->google_ads_customer_id,
                $start,
                $end,
            );
            $bundle->ads['google'] = $result;
            Log::info('GoogleAds sync result', [
                'client_id'   => $client->id,
                'customer_id' => $client->google_ads_customer_id,
                'has_data'    => !empty($result),
                'spend'       => $result['spend'] ?? null,
            ]);
        } else {
            Log::info('GoogleAds skipped (no customer_id)', ['client_id' => $client->id]);
        }

        $rows = $calculator->build($bundle);
        $now = now();

        foreach ($rows as $row) {
            MonthlySnapshot::updateOrCreate(
                [
                    'client_id'  => $client->id,
                    'year'       => $this->year,
                    'month'      => $this->month,
                    'area'       => $row['area'],
                    'metric_key' => $row['metric_key'],
                ],
                [
                    'value'     => $row['value'],
                    'meta'      => $row['meta'] ?? null,
                    'synced_at' => $now,
                ],
            );
        }

        Log::info('Metrics synced', [
            'client_id' => $client->id,
            'year'      => $this->year,
            'month'     => $this->month,
            'rows'      => count($rows),
        ]);
    }
}
