<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('link_datas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ads_link_id')->constrained('ads_links')->cascadeOnDelete();
            $table->string('campaign_id')->nullable()->unique();
            $table->string('style_code', 100)->nullable();
            $table->string('channel_code', 100)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('link_datas');
    }
};
