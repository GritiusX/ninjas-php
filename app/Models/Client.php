<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Client extends Model
{
    protected $fillable = [
        'name',
        'context_path',
        'whatsapp_number',
        'roas_goal',
        'meta_ad_account_id',
    ];

    protected function casts(): array
    {
        return [
            'roas_goal' => 'decimal:2',
        ];
    }

    public function contentPieces(): HasMany
    {
        return $this->hasMany(ContentPiece::class);
    }

    public function adMetrics(): HasMany
    {
        return $this->hasMany(AdMetric::class);
    }

    public function getBrandContext(): string
    {
        if ($this->context_path && Storage::exists($this->context_path)) {
            return Storage::get($this->context_path);
        }

        return '';
    }
}
