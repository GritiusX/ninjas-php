<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('metricool_metric_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('network', 32);   // facebook | instagram | tiktok | etc.
            $table->date('captured_on');     // día del snapshot (un punto por día)
            $table->json('data');
            $table->timestamp('scraped_at');
            $table->timestamps();

            $table->unique(['client_id', 'network', 'captured_on'], 'metric_history_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('metricool_metric_history');
    }
};
