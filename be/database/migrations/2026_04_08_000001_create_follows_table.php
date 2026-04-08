<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('follows', function (Blueprint $table): void {
            $table->id();
            $table->string('email', 255);
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('post_id')->nullable()->constrained('posts')->nullOnDelete();
            $table->foreignId('ads_link_id')->nullable()->constrained('ads_links')->nullOnDelete();
            $table->string('style_code', 100)->nullable()->comment('Snapshot');
            $table->string('channel_code', 100)->nullable()->comment('Snapshot');
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['site_id', 'email']);
            $table->index(['site_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('follows');
    }
};
