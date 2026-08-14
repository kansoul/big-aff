<?php

use App\Enums\AdsConversionType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ads_conversions', function (Blueprint $table): void {
            // Existing rows are all Google Ads conversions.
            $table->enum('type', AdsConversionType::values())
                ->default(AdsConversionType::GOOGLE->value)
                ->after('account_id');
            $table->string('ttclid')->nullable()->after('gbraid');

            $table->index('type');
            $table->index('ttclid');
        });
    }

    public function down(): void
    {
        Schema::table('ads_conversions', function (Blueprint $table): void {
            $table->dropIndex(['type']);
            $table->dropIndex(['ttclid']);
            $table->dropColumn(['type', 'ttclid']);
        });
    }
};
