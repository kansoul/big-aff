<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_centers', function (Blueprint $table) {
            $table->id();
            $table->string('bc_id')->nullable();
            $table->string('name');
            $table->string('ads_type', 50); // 'facebook', 'google'
            $table->unsignedBigInteger('team_id')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_centers');
    }
};
