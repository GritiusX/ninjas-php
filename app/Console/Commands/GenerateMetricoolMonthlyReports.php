<?php

namespace App\Console\Commands;

use App\Mail\MetricoolReportsReady;
use App\Models\Client;
use App\Models\User;
use App\Services\Metricool\MetricoolClient;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class GenerateMetricoolMonthlyReports extends Command
{
    protected $signature = 'metricool:monthly-reports
        {--month= : Month to generate (YYYY-MM, defaults to previous month)}
        {--timeout=600 : Max seconds to wait for reports to be ready}
        {--poll=30 : Seconds between poll attempts}';

    protected $description = 'Generate Metricool PDF reports for all clients, zip them, and email admins a download link';

    public function handle(MetricoolClient $mc): int
    {
        $target  = $this->resolveMonth();
        $start   = $target->copy()->startOfMonth();
        $end     = $target->copy()->endOfMonth();
        $period  = $target->format('Y-m');

        $this->info("Generating Metricool reports for {$period}...");

        $clients = Client::whereNotNull('metricool_blog_id')->orderBy('name')->get();

        if ($clients->isEmpty()) {
            $this->warn('No clients with metricool_blog_id found.');
            return self::SUCCESS;
        }

        // Step 1 — fire createReport for every client
        foreach ($clients as $client) {
            $this->line("  → Requesting report for {$client->name}");
            $mc->createReport($client->metricool_blog_id, $start, $end);
        }

        // Step 2 — poll until all clients have a FINISHED report (or timeout)
        $timeout    = (int) $this->option('timeout');
        $pollEvery  = (int) $this->option('poll');
        $started    = time();
        $unsupported = [];
        $finished   = [];

        $this->info("Waiting for reports (timeout: {$timeout}s, polling every {$pollEvery}s)...");

        while (true) {
            sleep($pollEvery);
            $elapsed = time() - $started;

            foreach ($clients as $client) {
                if (isset($finished[$client->id]) || isset($unsupported[$client->id])) {
                    continue;
                }

                $raw = $mc->listReportsRaw($client->metricool_blog_id);

                if (($raw['_status'] ?? 200) === 400) {
                    $this->line("  ⚠  {$client->name}: reports API not supported, skipping.");
                    $unsupported[$client->id] = true;
                    continue;
                }

                $items   = $raw['data'] ?? (array_is_list($raw) ? array_filter($raw, 'is_array') : []);
                $report  = collect($items)
                    ->filter(fn ($r) => ($r['status'] ?? '') === 'FINISHED' && isset($r['reportFile']))
                    ->sortByDesc('creationDate')
                    ->first();

                if ($report) {
                    $this->line("  ✓  {$client->name}: report ready.");
                    $finished[$client->id] = $report;
                }
            }

            $pending = $clients->filter(
                fn ($c) => ! isset($finished[$c->id]) && ! isset($unsupported[$c->id])
            );

            if ($pending->isEmpty()) {
                $this->info('All reports ready.');
                break;
            }

            if ($elapsed >= $timeout) {
                $names = $pending->pluck('name')->implode(', ');
                $this->warn("Timeout reached. Still pending: {$names}. Proceeding with available reports.");
                break;
            }

            $this->line("  Waiting... ({$elapsed}s elapsed, " . $pending->count() . " pending)");
        }

        if (empty($finished)) {
            $this->warn('No finished reports to package.');
            return self::SUCCESS;
        }

        // Step 3 — build ZIP
        $zipPath = $this->buildZip($mc, $clients, $finished, $period);

        if (! $zipPath) {
            $this->error('Failed to build ZIP.');
            return self::FAILURE;
        }

        // Step 4 — send email to all admins (ZIP adjunto + link de descarga)
        $storagePath = "metricool-reports/reportes-{$period}.zip";
        $downloadUrl = Storage::disk('public')->url($storagePath);
        $admins      = User::where('role', 'admin')->get();

        foreach ($admins as $admin) {
            Mail::to($admin->email)->send(
                new MetricoolReportsReady($period, $downloadUrl, count($finished), $storagePath)
            );
        }

        $this->info("Email sent to " . $admins->count() . " admin(s). ZIP: {$downloadUrl}");

        return self::SUCCESS;
    }

    private function buildZip(MetricoolClient $mc, $clients, array $finished, string $period): ?string
    {
        $tmpFile = tempnam(sys_get_temp_dir(), 'mc_monthly_');
        $zip     = new ZipArchive();

        if ($zip->open($tmpFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            Log::error('[MetricoolMonthly] Could not create ZIP file.');
            return null;
        }

        foreach ($clients as $client) {
            $report = $finished[$client->id] ?? null;
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
                $this->warn("  No download path for {$client->name}, skipping.");
                continue;
            }

            try {
                $file = Http::timeout(30)->get($path);
                if (! $file->successful()) {
                    continue;
                }
                $ext      = pathinfo(parse_url($path, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'pdf';
                $filename = str($client->name)->slug() . '.' . $ext;
                $zip->addFromString($filename, $file->body());
                $this->line("  + Added {$filename}");
            } catch (ConnectionException $e) {
                $this->warn("  Failed to download report for {$client->name}: {$e->getMessage()}");
            }
        }

        $zip->close();

        $destination = "metricool-reports/reportes-{$period}.zip";
        Storage::disk('public')->put($destination, file_get_contents($tmpFile));
        @unlink($tmpFile);

        return $destination;
    }

    private function resolveMonth(): Carbon
    {
        $option = $this->option('month');

        if ($option && preg_match('/^(\d{4})-(\d{1,2})$/', $option, $m)) {
            return Carbon::create((int) $m[1], (int) $m[2], 1);
        }

        return now()->subMonthNoOverflow()->startOfMonth();
    }
}
