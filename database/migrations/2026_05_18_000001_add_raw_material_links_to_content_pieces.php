<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_pieces', function (Blueprint $table) {
            $table->json('raw_material_links')->nullable()->after('raw_material_link');
        });
    }

    public function down(): void
    {
        Schema::table('content_pieces', function (Blueprint $table) {
            $table->dropColumn('raw_material_links');
        });
    }
};
