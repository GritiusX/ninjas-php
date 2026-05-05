<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('context_path', 255)->nullable();
            $table->string('whatsapp_number', 30)->nullable();
            $table->decimal('roas_goal', 5, 2)->default(3.00);
            $table->string('meta_ad_account_id', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
