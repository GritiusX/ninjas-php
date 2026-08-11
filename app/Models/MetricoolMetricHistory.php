<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetricoolMetricHistory extends Model
{
    protected $table = 'metricool_metric_history';

    protected $fillable = [
        'client_id',
        'network',
        'captured_on',
        'data',
        'scraped_at',
    ];

    protected $casts = [
        'data'        => 'array',
        'captured_on' => 'date',
        'scraped_at'  => 'datetime',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public static function store(int $clientId, string $network, string $capturedOn, array $data): self
    {
        return self::updateOrCreate(
            [
                'client_id'   => $clientId,
                'network'     => $network,
                'captured_on' => $capturedOn,
            ],
            [
                'data'       => $data,
                'scraped_at' => now(),
            ]
        );
    }

    /**
     * Últimos $days snapshots (ordenados de más viejo a más nuevo, listo para
     * graficar de izquierda a derecha) para un cliente/red.
     */
    public static function recentFor(int $clientId, string $network, int $days = 30): Collection
    {
        return self::where('client_id', $clientId)
            ->where('network', $network)
            ->orderByDesc('captured_on')
            ->limit($days)
            ->get(['captured_on', 'data'])
            ->reverse()
            ->values();
    }

    /**
     * Borra snapshots más viejos que $days días. Se llama una vez al final del
     * comando diario, no en cada store() — el historial no necesita crecer
     * indefinidamente, solo cubrir la ventana que muestra el frontend (30 días)
     * con margen.
     */
    public static function pruneOlderThan(int $days = 120): int
    {
        return self::where('captured_on', '<', now()->subDays($days)->toDateString())->delete();
    }
}
