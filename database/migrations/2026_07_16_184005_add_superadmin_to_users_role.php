<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('editor','pm','admin','superadmin') NOT NULL DEFAULT 'editor'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('editor','pm','admin') NOT NULL DEFAULT 'editor'");
    }
};
