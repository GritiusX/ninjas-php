<?php

namespace App\Jobs;

use App\Services\Metricool\MetricoolClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class GenerateMetricoolReport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 30;
    public int $tries   = 1;

    public function __construct(
        public readonly string $blogId,
        public readonly string $startDate, // Ymd
        public readonly string $endDate,   // Ymd
    ) {}

    public function handle(MetricoolClient $mc): void
    {
        $start = Carbon::createFromFormat('Ymd', $this->startDate)->startOfMonth();
        $end   = Carbon::createFromFormat('Ymd', $this->endDate)->endOfMonth();

        $mc->createReport($this->blogId, $start, $end);
    }
}
