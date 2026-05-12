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
        Schema::create('adx_account_conversions', function (Blueprint $table) {
            $table->id();
            $table->string('source', 50)->index();
            $table->string('account_id', 191)->index();
            $table->string('conversion_type', 50)->index();
            $table->string('conversion_action_id', 191);
            $table->string('name')->nullable();
            $table->string('status', 50)->default('active')->index();
            $table->timestamps();

            $table->unique(['source', 'account_id', 'conversion_type'], 'adx_account_conv_source_account_type_uid');
            $table->index(['source', 'account_id', 'status'], 'adx_account_conv_source_account_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adx_account_conversions');
    }
};
