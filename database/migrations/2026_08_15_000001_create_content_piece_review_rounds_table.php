<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_piece_review_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_piece_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('round_number');
            $table->string('review_token', 64);
            $table->string('video_link', 500)->nullable();
            $table->string('client_chosen_copy', 20)->nullable();
            $table->dateTime('sent_at');
            $table->enum('client_decision', ['pending', 'approved', 'revision'])->default('pending');
            $table->text('client_feedback')->nullable();
            $table->dateTime('responded_at')->nullable();
            $table->timestamps();

            $table->index('review_token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_piece_review_rounds');
    }
};
