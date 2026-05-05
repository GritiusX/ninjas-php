<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdMetric extends Model
{
    protected $fillable = [
        'client_id',
        'date',
        'investment',
        'revenue',
        'transactions',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'investment' => 'decimal:2',
            'revenue' => 'decimal:2',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function getRoas(): float
    {
        if ((float) $this->investment === 0.0) {
            return 0;
        }

        return round((float) $this->revenue / (float) $this->investment, 2);
    }
}
