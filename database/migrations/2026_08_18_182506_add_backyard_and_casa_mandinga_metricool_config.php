<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Casa Mandinga — blogId 6039361: facebook, instagram, metaAds
        DB::table('clients')->where('name', 'Casa Mandinga')->update([
            'metricool_blog_id'  => '6039361',
            'metricool_networks' => json_encode(['facebook', 'instagram', 'metaAds']),
        ]);

        // The Backyard Catering — blogId 6326133: facebook, instagram, metaAds
        DB::table('clients')->insertOrIgnore([
            'name'               => 'The Backyard Catering',
            'metricool_blog_id'  => '6326133',
            'metricool_networks' => json_encode(['facebook', 'instagram', 'metaAds']),
            'roas_goal'          => 3.00,
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('clients')->where('name', 'Casa Mandinga')->update([
            'metricool_blog_id'  => null,
            'metricool_networks' => null,
        ]);

        DB::table('clients')->where('name', 'The Backyard Catering')->delete();
    }
};
