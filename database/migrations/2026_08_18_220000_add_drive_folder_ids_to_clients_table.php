<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('drive_folder_id')->nullable()->after('context_path');
            $table->string('drive_in_progress_folder_id')->nullable()->after('drive_folder_id');
            $table->string('drive_final_folder_id')->nullable()->after('drive_in_progress_folder_id');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['drive_folder_id', 'drive_in_progress_folder_id', 'drive_final_folder_id']);
        });
    }
};
