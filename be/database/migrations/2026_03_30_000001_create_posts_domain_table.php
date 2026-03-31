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
        if (Schema::hasTable('posts')) {
            return;
        }

        Schema::create('posts', function (Blueprint $table) {
            $table->id();

            $table->string('site');

            $table->string('title');
            $table->string('slug');
            $table->string('lang')->nullable()->default('en');
            $table->text('description');
            $table->longText('content')->nullable();
            $table->string('feature_media')->nullable();

            $table->text('keyword')->nullable();

            $table->enum('status', ['draft', 'published', 'trash'])->default('draft');
            $table->enum('type', ['normal', 'ai', 'wordpress'])->default('normal');
            $table->date('published_at')->nullable();

            $table->string('tags')->nullable();

            $table->foreignId('category_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');

            $table->boolean('ai_posts_generated')->default(false);
            $table->unsignedBigInteger('original_post_id')->nullable();
            $table->foreign('original_post_id')->references('id')->on('posts')->onDelete('set null');
            $table->boolean('disable_generated')->default(false);

            $table->unique(['slug', 'deleted_at', 'site']);

            $table->softDeletes();
            $table->timestamps();

            $table->fullText(['title', 'description'], 'posts_title_desc_ft');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
