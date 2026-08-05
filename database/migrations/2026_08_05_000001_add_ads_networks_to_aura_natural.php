<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('clients')->where('name', 'Aura Natural')->update([
            'metricool_networks' => json_encode(['facebook', 'instagram', 'googleAds', 'metaAds']),
        ]);
    }

    public function down(): void
    {
        DB::table('clients')->where('name', 'Aura Natural')->update([
            'metricool_networks' => json_encode(['facebook', 'instagram']),
        ]);
    }
};
