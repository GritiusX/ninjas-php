<?php

namespace App\Console\Commands;

use App\Jobs\SyncClientMetricsForMonth;
use App\Models\Client;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SyncMetricoolMonthly extends Command
{
    protected $signature = 'metricool:sync
        {--client= : Sync only this client id (optional)}
        {--year= : Year to sync (defaults to previous month)}
        {--month= : Month to sync (defaults to previous month)}
        {--sync : Run synchronously instead of dispatching to the queue}';

    protected $description = 'Pull Metricool monthly metrics for one or all clients';

    public function handle(): int
    {
        $target = ($this->option('year') && $this->option('month'))
            ? Carbon::create((int) $this->option('year'), (int) $this->option('month'), 1)
            : now()->subMonthNoOverflow()->startOfMonth();

        $year  = $target->year;
        $month = $target->month;

        $query = Client::query()->whereNotNull('metricool_blog_id');
        if ($id = $this->option('client')) {
            $query->where('id', (int) $id);
        }

        $clients = $query->get();

        if ($clients->isEmpty()) {
            $this->warn('No clients with metricool_blog_id found.');
            return self::SUCCESS;
        }

        foreach ($clients as $client) {
            $this->info("Queuing sync for {$client->name} ({$year}-{$month})");

            $job = new SyncClientMetricsForMonth($client->id, $year, $month);

            if ($this->option('sync')) {
                $job->handle(
                    app(\App\Services\Metricool\MetricoolBundleBuilder::class),
                    app(\App\Services\Metricool\KpiCalculator::class),
                    app(\App\Services\GoogleAdsService::class),
                );
            } else {
                dispatch($job);
            }
        }

        $this->info('Done.');
        return self::SUCCESS;
    }
}
