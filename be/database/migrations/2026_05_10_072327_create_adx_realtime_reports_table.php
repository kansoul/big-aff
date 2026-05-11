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
        Schema::create('adx_realtime_reports', function (Blueprint $table) {
            $table->id();
            $table->date('report_date')->index();
            $table->foreignId('adx_link_data_id')->nullable()->constrained('adx_link_datas')->nullOnDelete();
            $table->unsignedBigInteger('landing_views')->default(0);
            $table->unsignedBigInteger('get_game_link_clicks')->default(0);
            $table->unsignedBigInteger('detail_views')->default(0);
            $table->unsignedBigInteger('get_bonus_clicks')->default(0);
            $table->timestamps();

            $table->unique(['report_date', 'adx_link_data_id'], 'adx_rt_reports_date_link_data_uid');
            $table->index(['adx_link_data_id', 'report_date'], 'adx_rt_reports_link_data_date_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adx_realtime_reports');
    }
};
