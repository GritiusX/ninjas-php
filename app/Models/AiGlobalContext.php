<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiGlobalContext extends Model
{
    protected $table    = 'ai_global_context';
    protected $fillable = ['context'];

    public static function get(): string
    {
        return static::first()?->context ?? '';
    }

    public static function set(string $context): void
    {
        $row = static::first();
        if ($row) {
            $row->update(['context' => $context]);
        } else {
            static::create(['context' => $context]);
        }
    }
}
