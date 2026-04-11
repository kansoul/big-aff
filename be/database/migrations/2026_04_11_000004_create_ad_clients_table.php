<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Used by: Ad Clients
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ad_clients', function (Blueprint $table) {
            $table->id();
            $table->string('ad_client_id')->unique();
            $table->string('product_code')->nullable();
            $table->string('product_name')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ad_clients');
    }
};
