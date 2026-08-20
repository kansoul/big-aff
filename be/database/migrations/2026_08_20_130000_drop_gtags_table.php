<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('gtags');
    }

    public function down(): void
    {
        Schema::create('gtags', function (Blueprint $table) {
            $table->id();
            $table->string('account_id');
            $table->string('code')->nullable();
            $table->string('article_view')->nullable();
            $table->string('rsu_click')->nullable();
            $table->string('search_view')->nullable();
            $table->string('search_click')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('account_id');
        });
    }
};
