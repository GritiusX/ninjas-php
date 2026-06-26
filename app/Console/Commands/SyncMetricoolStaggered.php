<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Services\GoogleAds\GoogleAdsService;
use App\Services\Metricool\KpiCalculator;
use App\Services\Metricool\MetricoolBundleBuilder;
use App\Jobs\SyncClientMetricsForMonth;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SyncMetricoolStaggered extends Command
{
    protected $signature = 'metricool:sync-staggered
        {--year= : Year to sync (defaults to current month)}
        {--month= : Month to sync (defaults to current month)}
        {--previous-month : Sync the previous month instead of the current one}
        {--delay=10 : Seconds to wait between each client}';

    protected $description = 'Sync Metricool metrics client by client with a delay between each one';

    public function handle(
        MetricoolBundleBuilder $builder,
        KpiCalculator $calculator,
        GoogleAdsService $googleAds,
    ): int {
        $target = $this->option('previous-month')
            ? now()->subMonthNoOverflow()->startOfMonth()
            : (($this->option('year') && $this->option('month'))
                ? Carbon::create((int) $this->option('year'), (int) $this->option('month'), 1)
                : now()->startOfMonth());

        $year  = $target->year;
        $month = $target->month;
        $delay = max(0, (int) $this->option('delay'));

        $clients = Client::query()
            ->whereNotNull('metricool_blog_id')
            ->orderBy('name')
            ->get();

        if ($clients->isEmpty()) {
            $this->warn('No clients with metricool_blog_id found.');
            return self::SUCCESS;
        }

        $this->info("Syncing {$clients->count()} client(s) for {$year}-{$month} ({$delay}s delay between each)");

        foreach ($clients as $i => $client) {
            if ($i > 0 && $delay > 0) {
                $this->line("  Waiting {$delay}s...");
                sleep($delay);
            }

            $this->info("[{$i}-of-{$clients->count()}] {$client->name}");

            try {
                (new SyncClientMetricsForMonth($client->id, $year, $month))
                    ->handle($builder, $calculator, $googleAds);

                $this->info("  OK");
            } catch (\Throwable $e) {
                $this->error("  ERROR: {$e->getMessage()}");
            }
        }

        $this->info('Done.');
        return self::SUCCESS;
    }
}
