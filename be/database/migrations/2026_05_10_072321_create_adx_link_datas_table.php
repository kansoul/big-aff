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
        Schema::create('adx_link_datas', function (Blueprint $table) {
            $table->id();
            $table->string('source', 50)->index();
            $table->string('account_id', 191)->nullable()->index();
            $table->string('campaign_id', 191)->index();
            $table->foreignId('adx_link_id')->nullable()->constrained('adx_links')->nullOnDelete();
            $table->foreignId('adx_game_id')->nullable()->constrained('adx_games')->nullOnDelete();
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->unique(['source', 'campaign_id', 'adx_link_id'], 'adx_link_datas_source_campaign_link_uid');
            $table->index(['account_id', 'campaign_id'], 'adx_link_datas_account_campaign_idx');
            $table->index(['adx_link_id', 'adx_game_id'], 'adx_link_datas_link_game_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adx_link_datas');
    }
};
