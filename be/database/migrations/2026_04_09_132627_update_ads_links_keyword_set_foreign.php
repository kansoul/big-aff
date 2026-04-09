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
        Schema::table('ads_links', function (Blueprint $table) {
            $table->dropForeign(['keyword_set_id']);
            $table->foreign('keyword_set_id')->references('id')->on('keyword_sets')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ads_links', function (Blueprint $table) {
            $table->dropForeign(['keyword_set_id']);
            $table->foreign('keyword_set_id')->references('id')->on('post_keyword_sets')->nullOnDelete();
        });
    }
};
