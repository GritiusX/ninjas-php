<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Inertia\Response;

class ErrorLogController extends Controller
{
    public function index(): Response
    {
        $entries = $this->parseLatestLogs(100);

        return Inertia::render('admin/error-logs', ['entries' => $entries]);
    }

    private function parseLatestLogs(int $limit): array
    {
        $logDir  = storage_path('logs');
        $pattern = $logDir . '/errors-*.log';
        $files   = glob($pattern);

        if (empty($files)) {
            return [];
        }

        // Most recent file first
        rsort($files);

        $entries = [];
        $rawPattern = '/^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\]]*)\] \w+\.ERROR: (.+?)(\{.*\})? *$/m';

        foreach ($files as $file) {
            if (count($entries) >= $limit) break;

            $contents = File::get($file);

            // Split on log entry boundaries
            $blocks = preg_split('/(?=\[\d{4}-\d{2}-\d{2})/m', $contents, -1, PREG_SPLIT_NO_EMPTY);

            foreach (array_reverse($blocks) as $block) {
                if (count($entries) >= $limit) break;

                if (!preg_match('/^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\]]*)\] \w+\.ERROR: (.+)/s', $block, $m)) {
                    continue;
                }

                $timestamp = $m[1];
                $rest      = $m[2];

                // Extract JSON context if present
                $context = [];
                $message = $rest;
                if (preg_match('/^(.*?) (\{.*\})\s*$/s', $rest, $cm)) {
                    $message = trim($cm[1]);
                    $context = json_decode($cm[2], true) ?? [];
                }

                $entries[] = [
                    'timestamp' => $timestamp,
                    'message'   => trim($message),
                    'exception' => $context['exception'] ?? null,
                    'file'      => $context['file'] ?? null,
                    'url'       => $context['url'] ?? null,
                    'method'    => $context['method'] ?? null,
                    'user'      => $context['user'] ?? null,
                    'trace'     => $context['trace'] ?? null,
                ];
            }
        }

        return array_slice($entries, 0, $limit);
    }
}
