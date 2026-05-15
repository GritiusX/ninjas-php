<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlySnapshot extends Model
{
    protected $fillable = [
        'client_id',
        'year',
        'month',
        'area',
        'metric_key',
        'value',
        'meta',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'year'      => 'integer',
            'month'     => 'integer',
            'value'     => 'decimal:4',
            'meta'      => 'array',
            'synced_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
