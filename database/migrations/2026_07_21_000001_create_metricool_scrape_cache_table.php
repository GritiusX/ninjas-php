<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('metricool_scrape_cache', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('network', 32);   // facebook | instagram | tiktok | etc.
            $table->date('range_start');
            $table->date('range_end');
            $table->json('data');
            $table->timestamp('scraped_at');
            $table->timestamps();

            $table->unique(['client_id', 'network', 'range_start', 'range_end'], 'scrape_cache_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('metricool_scrape_cache');
    }
};
