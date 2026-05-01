<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ads_links', function (Blueprint $table) {
            $table->dropUnique('ads_links_slug_unique');
            $table->string('slug', 200)->change();
            $table->unique('slug');
        });
    }

    public function down(): void
    {
        Schema::table('ads_links', function (Blueprint $table) {
            $table->dropUnique('ads_links_slug_unique');
            $table->string('slug', 100)->change();
            $table->unique('slug');
        });
    }
};
