<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_pieces', function (Blueprint $table) {
            $table->string('review_token', 64)->nullable()->unique()->after('client_feedback');
            $table->string('client_chosen_copy', 20)->nullable()->after('review_token');
        });
    }

    public function down(): void
    {
        Schema::table('content_pieces', function (Blueprint $table) {
            $table->dropUnique(['review_token']);
            $table->dropColumn(['review_token', 'client_chosen_copy']);
        });
    }
};
