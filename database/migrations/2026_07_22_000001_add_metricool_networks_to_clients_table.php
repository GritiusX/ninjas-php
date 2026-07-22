<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->json('metricool_networks')->nullable()->after('metricool_blog_id');
        });

        // Configurar redes conocidas
        DB::table('clients')->where('name', 'Aura Natural')->update([
            'metricool_networks' => json_encode(['facebook', 'instagram']),
        ]);

        DB::table('clients')->where('name', 'Grill West AR')->update([
            'metricool_networks' => json_encode(['facebook', 'instagram', 'tiktok', 'youtube', 'googleAds']),
        ]);
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('metricool_networks');
        });
    }
};
