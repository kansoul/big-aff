<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pixels', function (Blueprint $table) {
            $table->dropUnique(['pixel_id']);
            $table->string('platform', 20)->default('tiktok')->after('id')->index();
            $table->foreignId('business_center_id')->nullable()->after('platform')->constrained('business_centers')->restrictOnDelete();
            $table->string('status', 20)->default('active')->after('name')->index();
            $table->unique(['platform', 'pixel_id']);
        });
    }

    public function down(): void
    {
        Schema::table('pixels', function (Blueprint $table) {
            $table->dropUnique(['platform', 'pixel_id']);
            $table->dropForeign(['business_center_id']);
            $table->dropColumn(['platform', 'business_center_id', 'status']);
            $table->unique('pixel_id');
        });
    }
};
