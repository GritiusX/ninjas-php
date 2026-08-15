<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentPieceReviewRound extends Model
{
    public const DECISION_PENDING = 'pending';
    public const DECISION_APPROVED = 'approved';
    public const DECISION_REVISION = 'revision';

    protected $fillable = [
        'content_piece_id',
        'round_number',
        'review_token',
        'video_link',
        'client_chosen_copy',
        'sent_at',
        'client_decision',
        'client_feedback',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'sent_at'      => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    public function contentPiece(): BelongsTo
    {
        return $this->belongsTo(ContentPiece::class);
    }
}
