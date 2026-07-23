<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class MetricoolDebugController extends Controller
{
    public function index(): \Inertia\Response
    {
        $disk  = Storage::disk('local');
        $files = $disk->files('private/metricool-debug');

        $screenshots = collect($files)
            ->filter(fn($f) => str_ends_with($f, '.png'))
            ->map(function ($file) {
                $filename = basename($file);
                // filename: label-YYYYMMDD-HHmmss.png
                preg_match('/^(.+)-(\d{8}-\d{6})\.png$/', $filename, $m);
                return [
                    'filename' => $filename,
                    'label'    => $m[1] ?? $filename,
                    'datetime' => isset($m[2])
                        ? \Carbon\Carbon::createFromFormat('Ymd-His', $m[2])->format('d/m/Y H:i:s')
                        : null,
                    'sort_key' => $m[2] ?? $filename,
                ];
            })
            ->sortByDesc('sort_key')
            ->values();

        return Inertia::render('admin/metricool-debug', [
            'screenshots' => $screenshots,
        ]);
    }

    public function image(Request $request): Response
    {
        $filename = $request->query('file', '');

        // Solo permitir nombres de archivo simples (sin path traversal)
        if (!preg_match('/^[\w\-]+-\d{8}-\d{6}\.png$/', $filename)) {
            abort(400);
        }

        $path = storage_path('app/private/metricool-debug/' . $filename);

        if (!file_exists($path)) {
            abort(404);
        }

        return response()->file($path, ['Content-Type' => 'image/png']);
    }
}
