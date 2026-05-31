<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertConfig extends Model
{
    // Alert types — global (client_id = null)
    const TYPE_EDITOR_OVERLOAD          = 'editor_overload';
    const TYPE_WEEKLY_MONDAY_PENDING    = 'weekly_monday_pending';
    const TYPE_WEEKLY_THURSDAY_MISSING  = 'weekly_thursday_missing';
    const TYPE_PRODUCTION_SUMMARY       = 'production_summary_monday';

    // Alert types — per client (client_id required)
    const TYPE_CONTENT_INACTIVITY = 'content_inactivity';
    const TYPE_CONTENT_NO_FUTURE  = 'content_no_future';
    const TYPE_CAMPAIGN_NO_SPEND  = 'campaign_no_spend';
    const TYPE_ROAS_BELOW         = 'roas_below';

    const GLOBAL_TYPES = [
        self::TYPE_EDITOR_OVERLOAD,
        self::TYPE_WEEKLY_MONDAY_PENDING,
        self::TYPE_WEEKLY_THURSDAY_MISSING,
        self::TYPE_PRODUCTION_SUMMARY,
    ];

    const CLIENT_TYPES = [
        self::TYPE_CONTENT_INACTIVITY,
        self::TYPE_CONTENT_NO_FUTURE,
        self::TYPE_CAMPAIGN_NO_SPEND,
        self::TYPE_ROAS_BELOW,
    ];

    // Default threshold values
    const DEFAULTS = [
        self::TYPE_EDITOR_OVERLOAD         => 6,
        self::TYPE_CONTENT_INACTIVITY      => 3,
        self::TYPE_CAMPAIGN_NO_SPEND       => 3,
        self::TYPE_WEEKLY_MONDAY_PENDING   => null,
        self::TYPE_WEEKLY_THURSDAY_MISSING => null,
        self::TYPE_PRODUCTION_SUMMARY      => null,
        self::TYPE_CONTENT_NO_FUTURE       => null,
        self::TYPE_ROAS_BELOW              => null,
    ];

    protected $fillable = [
        'alert_type',
        'client_id',
        'is_enabled',
        'threshold_value',
        'notify_admin',
        'notify_pm',
        'last_alerted_at',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled'      => 'boolean',
            'notify_admin'    => 'boolean',
            'notify_pm'       => 'boolean',
            'threshold_value' => 'float',
            'last_alerted_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
