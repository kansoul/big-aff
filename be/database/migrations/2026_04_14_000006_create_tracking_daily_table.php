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
        Schema::create('realtime_reports', function (Blueprint $table) {
            $table->id();

            $table->date('event_time')->index();
            $table->unsignedBigInteger('link_data_id')->nullable()->index();

            $table->unsignedBigInteger('view_article_count')->default(0);
            $table->unsignedBigInteger('view_search_count')->default(0);
            $table->unsignedBigInteger('click_keyword_count')->default(0);
            $table->unsignedBigInteger('click_ad_count')->default(0);

            $table->timestamps();

            $table->unique([
                'event_time',
                'link_data_id',
            ], 'realtime_reports_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('realtime_reports');
    }
};
