<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Clientes existentes — actualizar redes
        $updates = [
            'Eventos Parrilleros' => ['facebook', 'instagram', 'metaAds'],
            'Grill West AR'       => ['facebook', 'instagram', 'tiktok', 'youtube', 'metaAds', 'googleAds'],
            'Grill West Paraguay' => ['facebook', 'instagram'],
            'GWStoreOK'           => ['facebook', 'instagram', 'tiktok', 'metaAds', 'googleAds'],
            'ObraSur SA'          => ['facebook', 'instagram', 'metaAds'],
            'Rosso Osteria'       => ['facebook', 'instagram', 'metaAds'],
            'Sanatorios Anchorena'=> ['facebook', 'instagram', 'metaAds'],
        ];

        foreach ($updates as $name => $networks) {
            DB::table('clients')->where('name', $name)->update([
                'metricool_networks' => json_encode($networks),
            ]);
        }

        // Clientes nuevos
        DB::table('clients')->insertOrIgnore([
            'name'               => 'Parrilla Mandinga',
            'metricool_blog_id'  => '6326079',
            'metricool_networks' => json_encode(['facebook', 'instagram', 'metaAds']),
            'roas_goal'          => 3.00,
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);

        DB::table('clients')->insertOrIgnore([
            'name'               => 'Steak and Beer AR',
            'metricool_blog_id'  => '6514825',
            'metricool_networks' => json_encode(['facebook', 'instagram', 'metaAds']),
            'roas_goal'          => 3.00,
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);
    }

    public function down(): void
    {
        $nullify = [
            'Eventos Parrilleros',
            'Grill West Paraguay',
            'GWStoreOK',
            'ObraSur SA',
            'Rosso Osteria',
            'Sanatorios Anchorena',
        ];

        foreach ($nullify as $name) {
            DB::table('clients')->where('name', $name)->update([
                'metricool_networks' => null,
            ]);
        }

        DB::table('clients')->where('name', 'Grill West AR')->update([
            'metricool_networks' => json_encode(['facebook', 'instagram', 'tiktok', 'youtube', 'googleAds']),
        ]);

        DB::table('clients')->whereIn('name', ['Parrilla Mandinga', 'Steak and Beer AR'])->delete();
    }
};
