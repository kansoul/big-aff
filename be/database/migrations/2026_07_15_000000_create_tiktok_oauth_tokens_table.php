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
        Schema::create('tiktok_oauth_tokens', function (Blueprint $table) {
            $table->id();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->string('token_type')->default('Bearer');
            $table->integer('expires_in')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->integer('refresh_token_expires_in')->nullable();
            $table->timestamp('refresh_token_expires_at')->nullable();
            $table->text('scope')->nullable();
            $table->json('advertiser_ids')->nullable();
            $table->string('creator_id')->nullable();
            $table->json('raw_response')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->index('is_active');
            $table->index('creator_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tiktok_oauth_tokens');
    }
};
