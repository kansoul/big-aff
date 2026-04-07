<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_center_id')->nullable()->constrained('business_centers')->nullOnDelete();
            $table->string('account_id')->unique();
            $table->string('account_name')->nullable();
            $table->string('ads_type', 50);
            $table->string('status', 50)->nullable();
            $table->boolean('is_special')->default(false);
            $table->boolean('sync_to_mcc')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
