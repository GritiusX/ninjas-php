<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('clients', 'google_ads_customer_id')) {
            return;
        }

        Schema::table('clients', function (Blueprint $table) {
            $table->string('google_ads_customer_id')->nullable()->after('metricool_blog_id');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('google_ads_customer_id');
        });
    }
};
