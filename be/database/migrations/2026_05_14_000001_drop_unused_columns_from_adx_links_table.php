<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $existingFks = array_column(
            DB::select("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'adx_links' AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_SCHEMA = DATABASE()"),
            'CONSTRAINT_NAME',
        );

        Schema::table('adx_links', function (Blueprint $table) use ($existingFks): void {
            if (in_array('adx_links_adx_game_id_foreign', $existingFks, true)) {
                $table->dropForeign('adx_links_adx_game_id_foreign');
            }
            if (Schema::hasIndex('adx_links', 'adx_links_game_source_status_idx')) {
                $table->dropIndex('adx_links_game_source_status_idx');
            }
            if (Schema::hasIndex('adx_links', 'adx_links_source_index')) {
                $table->dropIndex('adx_links_source_index');
            }
            $cols = array_values(array_filter(['source', 'slug', 'url_template'], fn (string $col) => Schema::hasColumn('adx_links', $col)));
            if (! empty($cols)) {
                $table->dropColumn($cols);
            }
        });

        $existingFksAfter = array_column(
            DB::select("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'adx_links' AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_SCHEMA = DATABASE()"),
            'CONSTRAINT_NAME',
        );

        if (! in_array('adx_links_adx_game_id_foreign', $existingFksAfter, true)) {
            Schema::table('adx_links', function (Blueprint $table): void {
                $table->foreign('adx_game_id')->references('id')->on('adx_games')->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('adx_links', function (Blueprint $table): void {
            $table->string('source', 50)->nullable()->after('name')->index();
            $table->string('slug')->nullable()->after('name');
            $table->text('url_template')->nullable()->after('landing_url');
            $table->dropForeign('adx_links_adx_game_id_foreign');
            $table->index(['adx_game_id', 'source', 'status'], 'adx_links_game_source_status_idx');
            $table->foreign('adx_game_id')->references('id')->on('adx_games')->cascadeOnDelete();
        });
    }
};
