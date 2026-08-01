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
        Schema::table('follows', function (Blueprint $table) {
            $table->dropForeign(['site_id']);
            $table->dropForeign(['ads_link_id']);
            $table->dropIndex('follows_site_id_email_index');
            $table->dropUnique('follows_site_id_email_unique');
            $table->dropColumn('site_id');
            $table->dropColumn('ads_link_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('follows', function (Blueprint $table) {
            $table->foreignId('site_id')->after('email')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('ads_link_id')->nullable()->constrained('ads_links')->nullOnDelete();

            $table->unique(['site_id', 'email']);
            $table->index(['site_id', 'email']);
        });
    }
};
