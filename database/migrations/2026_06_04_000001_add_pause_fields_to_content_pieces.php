<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_pieces', function (Blueprint $table) {
            $table->timestamp('paused_until')->nullable()->after('is_scheduled');
            $table->text('pause_reason')->nullable()->after('paused_until');
        });
    }

    public function down(): void
    {
        Schema::table('content_pieces', function (Blueprint $table) {
            $table->dropColumn(['paused_until', 'pause_reason']);
        });
    }
};
