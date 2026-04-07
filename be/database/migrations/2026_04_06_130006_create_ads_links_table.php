<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ads_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('post_id')->nullable()->constrained('posts')->nullOnDelete();
            $table->string('slug', 100)->unique();
            $table->text('rac');
            $table->text('note')->nullable();
            $table->boolean('is_hidden')->default(false);
            $table->string('channel_code', 100)->nullable(); // ref: channels.code
            $table->string('style_code', 100)->nullable(); // ref: styles.code
            $table->foreignId('keyword_set_id')->nullable()->constrained('post_keyword_sets')->nullOnDelete();
            $table->json('tracking_ids')->nullable(); // fb_id, customer_id
            $table->unique(['site_id', 'post_id', 'style_code', 'channel_code', 'deleted_at'], 'ads_links_composite_unique');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ads_links');
    }
};
