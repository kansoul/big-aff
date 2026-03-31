<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tổng hợp schema bảng categories theo App\Models\Category (và migration gốc 2024_06_20_152002).
     */
    public function up(): void
    {
        if (Schema::hasTable('categories')) {
            return;
        }

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('site');
            $table->foreignId('parent_id')->nullable()->constrained('categories')->onDelete('set null');
            $table->string('name');
            $table->longText('description')->nullable();
            $table->string('feature_media')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->unique(['site', 'name', 'deleted_at'], 'categories_site_name_deleted_unique');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
