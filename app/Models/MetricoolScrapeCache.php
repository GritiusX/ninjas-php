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
