<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gtags', function (Blueprint $table) {
            $table->id();
            $table->string('account_id');
            $table->string('code')->nullable();
            $table->string('article_view')->nullable();
            $table->string('rsu_click')->nullable();
            $table->string('search_view')->nullable();
            $table->string('search_click')->nullable();
            $table->timestamps();

            $table->foreign('account_id')->references('account_id')->on('accounts')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gtags');
    }
};
