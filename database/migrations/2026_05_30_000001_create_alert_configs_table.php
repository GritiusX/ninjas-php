<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alert_configs', function (Blueprint $table) {
            $table->id();
            $table->string('alert_type', 60);
            $table->foreignId('client_id')->nullable()->constrained()->cascadeOnDelete();
            $table->boolean('is_enabled')->default(true);
            $table->decimal('threshold_value', 10, 2)->nullable();
            $table->boolean('notify_admin')->default(true);
            $table->boolean('notify_pm')->default(true);
            $table->timestamps();

            $table->unique(['alert_type', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_configs');
    }
};
