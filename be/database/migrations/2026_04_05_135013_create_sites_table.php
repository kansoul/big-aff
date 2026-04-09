<?php

use App\Enums\SiteStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sites', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('url')->unique();
            $table->string('secret_key');
            $table->foreignId('logo_id')->nullable()->constrained('files')->nullOnDelete();
            $table->foreignId('favicon_id')->nullable()->constrained('files')->nullOnDelete();
            $table->json('settings')->nullable();
            $table->text('description')->nullable();
            $table->string('status', 20)->default(SiteStatus::ACTIVE->value);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sites');
    }
};
