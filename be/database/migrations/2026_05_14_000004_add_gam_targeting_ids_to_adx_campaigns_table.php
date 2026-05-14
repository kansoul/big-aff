<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('adx_campaigns', function (Blueprint $table): void {
            $table->unsignedBigInteger('gam_custom_key_id')->nullable()->after('gam_custom_key');
            $table->unsignedBigInteger('gam_custom_value_id')->nullable()->after('gam_custom_value');
            $table->index(['gam_custom_key_id', 'gam_custom_value_id'], 'adx_campaigns_gam_target_ids_idx');
        });
    }

    public function down(): void
    {
        Schema::table('adx_campaigns', function (Blueprint $table): void {
            $table->dropIndex('adx_campaigns_gam_target_ids_idx');
            $table->dropColumn(['gam_custom_key_id', 'gam_custom_value_id']);
        });
    }
};
