<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentPiece extends Model
{
    public const STATUS_BRIEF = 'BRIEF';
    public const STATUS_EDITING = 'EDITING';
    public const STATUS_INTERNAL_REVIEW = 'INTERNAL_REVIEW';
    public const STATUS_REVISION = 'REVISION';
    public const STATUS_PM_APPROVED = 'PM_APPROVED';
    public const STATUS_CLIENT_REVIEW = 'CLIENT_REVIEW';
    public const STATUS_CLIENT_REVISION = 'CLIENT_REVISION';
    public const STATUS_CLIENT_APPROVED = 'CLIENT_APPROVED';

    public const PRIORITY_CRITICAL = 1;
    public const PRIORITY_HIGH = 2;
    public const PRIORITY_MEDIUM = 3;

    public const PRIORITY_LABELS = [
        self::PRIORITY_CRITICAL => 'Crítico',
        self::PRIORITY_HIGH => 'Alto',
        self::PRIORITY_MEDIUM => 'Medio',
    ];

    protected $fillable = [
        'client_id',
        'assigned_editor_id',
        'status',
        'priority',
        'deadline',
        'concept',
        'product',
        'category',
        'objective',
        'hook',
        'development',
        'cta',
        'brief_notes',
        'client_status',
        'is_scheduled',
        'paused_until',
        'pause_reason',
        'raw_material_link',
        'raw_material_links',
        'final_video_link',
        'internal_comments',
        'client_feedback',
        'generated_copy',
    ];

    protected function casts(): array
    {
        return [
            'deadline'     => 'datetime',
            'paused_until' => 'datetime',
            'is_scheduled' => 'boolean',
            'generated_copy'     => 'array',
            'raw_material_links' => 'array',
        ];
    }

    public function isPaused(): bool
    {
        return $this->paused_until !== null && $this->paused_until->isFuture();
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_editor_id');
    }

    public function getPriorityLabel(): string
    {
        return self::PRIORITY_LABELS[$this->priority] ?? 'Medio';
    }

    public function isOverdue(): bool
    {
        return $this->deadline && $this->deadline->isPast();
    }
}
