<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE content_pieces MODIFY COLUMN status ENUM('BRIEF','EDITING','INTERNAL_REVIEW','REVISION','PM_APPROVED','CLIENT_REVIEW','CLIENT_REVISION','CLIENT_APPROVED','PUBLISHED') NOT NULL DEFAULT 'BRIEF'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE content_pieces MODIFY COLUMN status ENUM('BRIEF','EDITING','INTERNAL_REVIEW','REVISION','PM_APPROVED','CLIENT_REVIEW','CLIENT_REVISION','CLIENT_APPROVED') NOT NULL DEFAULT 'BRIEF'");
    }
};
