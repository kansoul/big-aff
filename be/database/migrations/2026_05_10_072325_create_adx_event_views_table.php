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
        Schema::create('adx_event_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adx_link_data_id')->nullable()->constrained('adx_link_datas')->nullOnDelete();
            $table->string('page_key', 50)->nullable()->index();
            $table->string('event_type', 50)->index();
            $table->timestamp('occurred_at')->index();
            $table->timestamps();

            $table->index(['adx_link_data_id', 'event_type', 'occurred_at'], 'adx_event_views_link_type_time_idx');
            $table->index(['page_key', 'event_type'], 'adx_event_views_page_type_idx');
            $table->index(['occurred_at', 'event_type'], 'adx_event_views_time_type_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adx_event_views');
    }
};
