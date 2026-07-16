<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeminiUsage extends Model
{
    protected $fillable = ['user_id', 'content_piece_id', 'tokens_used'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contentPiece(): BelongsTo
    {
        return $this->belongsTo(ContentPiece::class);
    }

    public static function monthlyTotal(): int
    {
        return static::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('tokens_used');
    }

    public static function pieceCount(int $pieceId): int
    {
        return static::where('content_piece_id', $pieceId)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
    }
}
