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
        Schema::create('adx_conversion_uploads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adx_conversion_id')->constrained('adx_conversions')->cascadeOnDelete();
            $table->string('upload_status', 50)->default('pending')->index();
            $table->string('external_conversion_action', 191)->nullable();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->string('error_code', 100)->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('uploaded_at')->nullable()->index();
            $table->timestamps();

            $table->index(['adx_conversion_id', 'upload_status'], 'adx_conv_uploads_conversion_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adx_conversion_uploads');
    }
};
