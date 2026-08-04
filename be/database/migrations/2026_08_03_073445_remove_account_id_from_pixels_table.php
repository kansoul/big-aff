<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('pixels')
            ->select('pixel_id')
            ->groupBy('pixel_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('pixel_id')
            ->each(function (string $pixelId): void {
                $pixelIds = DB::table('pixels')
                    ->where('pixel_id', $pixelId)
                    ->orderByRaw('deleted_at IS NULL DESC')
                    ->orderBy('id')
                    ->pluck('id');
                $canonicalId = $pixelIds->shift();

                DB::table('ads_links')->whereIn('pixel_id', $pixelIds)->update(['pixel_id' => $canonicalId]);
                DB::table('pixels')->whereIn('id', $pixelIds)->delete();
            });

        Schema::table('pixels', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
        });

        Schema::table('pixels', function (Blueprint $table) {
            $table->dropUnique(['account_id', 'pixel_id']);
        });

        Schema::table('pixels', function (Blueprint $table) {
            $table->dropColumn('account_id');
        });

        Schema::table('pixels', function (Blueprint $table) {
            $table->unique('pixel_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pixels', function (Blueprint $table) {
            $table->dropUnique(['pixel_id']);
        });

        Schema::table('pixels', function (Blueprint $table) {
            $table->foreignId('account_id')->nullable()->after('id');
        });

        Schema::table('pixels', function (Blueprint $table) {
            $table->unique(['account_id', 'pixel_id']);
        });

        Schema::table('pixels', function (Blueprint $table) {
            $table->foreign('account_id')->references('id')->on('accounts')->cascadeOnDelete();
        });
    }
};
