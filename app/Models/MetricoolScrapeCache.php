<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetricoolScrapeCache extends Model
{
    protected $table = 'metricool_scrape_cache';

    protected $fillable = [
        'client_id',
        'network',
        'range_start',
        'range_end',
        'data',
        'scraped_at',
    ];

    protected $casts = [
        'data'        => 'array',
        'range_start' => 'date',
        'range_end'   => 'date',
        'scraped_at'  => 'datetime',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public static function findCached(int $clientId, string $network, string $start, string $end): ?self
    {
        return self::where('client_id', $clientId)
            ->where('network', $network)
            ->where('range_start', $start)
            ->where('range_end', $end)
            ->first();
    }

    /**
     * Última fila para este cliente/red que se haya scrapeado hace como mucho
     * $maxAgeDays días, sin importar qué range_start/range_end tenga guardado.
     * Se usa para no re-scrapear todos los días solo porque el rango "últimos
     * N días" se corre día a día y deja de matchear exacto con lo cacheado.
     */
    public static function findRecent(int $clientId, string $network, int $maxAgeDays): ?self
    {
        return self::where('client_id', $clientId)
            ->where('network', $network)
            ->where('scraped_at', '>=', now()->subDays($maxAgeDays))
            ->orderByDesc('scraped_at')
            ->first();
    }

    public static function store(int $clientId, string $network, string $start, string $end, array $data): self
    {
        return self::updateOrCreate(
            [
                'client_id'   => $clientId,
                'network'     => $network,
                'range_start' => $start,
                'range_end'   => $end,
            ],
            [
                'data'       => $data,
                'scraped_at' => now(),
            ]
        );
    }
}
