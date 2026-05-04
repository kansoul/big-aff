<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ads_conversions', function (Blueprint $table) {
            $table->string('conversion_date_time')->nullable()->change();
        });

        DB::table('ads_conversions')
            ->whereNotNull('conversion_date_time')
            ->orderBy('id')
            ->chunk(1000, function ($conversions) {
                foreach ($conversions as $conversion) {
                    try {
                        $parsedDate = Carbon::parse($conversion->conversion_date_time);
                        $formattedDate = $parsedDate->format('Y-m-d H:i:sP');

                        DB::table('ads_conversions')
                            ->where('id', $conversion->id)
                            ->update(['conversion_date_time' => $formattedDate]);
                    } catch (Exception $e) {
                        Log::error("Failed to parse date for conversion {$conversion->id}");
                    }
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('ads_conversions')
            ->whereNotNull('conversion_date_time')
            ->orderBy('id')
            ->chunk(1000, function ($conversions) {
                foreach ($conversions as $conversion) {
                    try {
                        $parsedDate = Carbon::parse($conversion->conversion_date_time);
                        $formattedDate = $parsedDate->format('Y-m-d H:i:s');

                        DB::table('ads_conversions')
                            ->where('id', $conversion->id)
                            ->update(['conversion_date_time' => $formattedDate]);
                    } catch (Exception $e) {
                        Log::error("Failed to parse date for conversion {$conversion->id}");
                    }
                }
            });

        Schema::table('ads_conversions', function (Blueprint $table) {
            $table->timestamp('conversion_date_time')->nullable()->change();
        });
    }
};
