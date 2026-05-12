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
        Schema::create('adx_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adx_game_id')->constrained('adx_games')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('source', 50)->index();
            $table->text('landing_url');
            $table->text('url_template')->nullable();
            $table->string('status', 50)->default('active')->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['adx_game_id', 'source', 'status'], 'adx_links_game_source_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adx_links');
    }
};
