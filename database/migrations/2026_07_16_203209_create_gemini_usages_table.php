<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gemini_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('content_piece_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('tokens_used');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gemini_usages');
    }
};
