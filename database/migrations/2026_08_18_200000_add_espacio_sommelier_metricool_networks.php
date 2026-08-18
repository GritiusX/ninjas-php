<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('clients')->where('name', 'Espacio Sommelier')->update([
            'metricool_networks' => json_encode(['facebook', 'instagram', 'metaAds']),
        ]);
    }

    public function down(): void
    {
        DB::table('clients')->where('name', 'Espacio Sommelier')->update([
            'metricool_networks' => null,
        ]);
    }
};
