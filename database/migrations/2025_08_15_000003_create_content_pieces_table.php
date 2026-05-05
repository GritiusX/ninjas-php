<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_pieces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_editor_id')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('status', [
                'BRIEF',
                'EDITING',
                'INTERNAL_REVIEW',
                'REVISION',
                'PM_APPROVED',
                'CLIENT_REVIEW',
                'CLIENT_REVISION',
                'CLIENT_APPROVED',
            ])->default('BRIEF');

            // 1=crítico, 2=alto, 3=medio
            $table->unsignedTinyInteger('priority')->default(3);
            $table->dateTime('deadline')->nullable();

            // Campos del brief
            $table->text('concept')->nullable();
            $table->text('product')->nullable();
            $table->string('category', 80)->nullable();
            $table->text('objective')->nullable();
            $table->text('hook')->nullable();
            $table->text('development')->nullable();
            $table->string('cta', 255)->nullable();
            $table->text('brief_notes')->nullable();
            $table->string('client_status', 120)->nullable();
            $table->boolean('is_scheduled')->default(false);

            // Assets
            $table->string('raw_material_link', 500)->nullable();
            $table->string('final_video_link', 500)->nullable();

            // Feedback y copy
            $table->text('internal_comments')->nullable();
            $table->text('client_feedback')->nullable();
            $table->json('generated_copy')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_pieces');
    }
};
