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
        Schema::table('post_keyword_sets', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['name', 'keywords', 'created_by', 'updated_by']);
            $table->dropColumn('deleted_at');
            $table->foreignId('keyword_set_id')->after('post_id')->constrained('keyword_sets')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('post_keyword_sets', function (Blueprint $table) {
            $table->dropForeign(['keyword_set_id']);
            $table->dropColumn('keyword_set_id');
            $table->string('name')->after('post_id');
            $table->json('keywords')->nullable()->after('name');
            $table->foreignId('created_by')->nullable()->after('keywords')->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            $table->softDeletes();
        });
    }
};
