<?php

namespace App\Console\Commands;

use App\Services\AlertService;
use Illuminate\Console\Command;

class RunAlerts extends Command
{
    protected $signature = 'alerts:run {--type= : Run only this alert type}';
    protected $description = 'Check and fire configured alerts';

    public function handle(AlertService $alertService): int
    {
        $type = $this->option('type');

        $checks = [
            'content_inactivity'      => fn () => $alertService->checkContentInactivity(),
            'content_no_future'       => fn () => $alertService->checkContentNoFuture(),
            'editor_overload'         => fn () => $alertService->checkEditorOverload(),
            'weekly_monday_pending'   => fn () => $alertService->checkWeeklyMondayPending(),
            'weekly_thursday_missing' => fn () => $alertService->checkWeeklyThursdayMissing(),
            'production_summary_monday' => fn () => $alertService->checkProductionSummaryMonday(),
            'campaign_no_spend'       => fn () => $alertService->checkCampaignNoSpend(),
            'roas_below'              => fn () => $alertService->checkRoasBelow(),
        ];

        if ($type) {
            if (!isset($checks[$type])) {
                $this->error("Unknown alert type: {$type}");
                return Command::FAILURE;
            }
            $this->info("Running: {$type}");
            ($checks[$type])();
            return Command::SUCCESS;
        }

        foreach ($checks as $name => $fn) {
            $this->info("Running: {$name}");
            $fn();
        }

        $this->info('All alerts checked.');
        return Command::SUCCESS;
    }
}
