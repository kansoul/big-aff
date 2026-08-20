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
        Schema::table('conversions', function (Blueprint $table) {
            $table->renameColumn('article_view', 'page_view');
            $table->renameColumn('rsu_click', 'redirect');
            $table->renameColumn('search_click', 'submit_form');
            $table->dropColumn('search_view');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conversions', function (Blueprint $table) {
            $table->renameColumn('page_view', 'article_view');
            $table->renameColumn('redirect', 'rsu_click');
            $table->renameColumn('submit_form', 'search_click');
            $table->string('search_view')->nullable()->after('rsu_click');
        });
    }
};
