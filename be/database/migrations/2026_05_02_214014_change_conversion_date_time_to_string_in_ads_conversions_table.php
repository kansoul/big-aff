<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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

        \Illuminate\Support\Facades\DB::table('ads_conversions')
            ->whereNotNull('conversion_date_time')
            ->orderBy('id')
            ->chunk(1000, function ($conversions) {
                foreach ($conversions as $conversion) {
                    try {
                        $parsedDate = \Carbon\Carbon::parse($conversion->conversion_date_time);
                        $formattedDate = $parsedDate->format('Y-m-d H:i:sP');
                        
                        \Illuminate\Support\Facades\DB::table('ads_conversions')
                            ->where('id', $conversion->id)
                            ->update(['conversion_date_time' => $formattedDate]);
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error("Failed to parse date for conversion {$conversion->id}");
                    }
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \Illuminate\Support\Facades\DB::table('ads_conversions')
            ->whereNotNull('conversion_date_time')
            ->orderBy('id')
            ->chunk(1000, function ($conversions) {
                foreach ($conversions as $conversion) {
                    try {
                        $parsedDate = \Carbon\Carbon::parse($conversion->conversion_date_time);
                        $formattedDate = $parsedDate->format('Y-m-d H:i:s');
                        
                        \Illuminate\Support\Facades\DB::table('ads_conversions')
                            ->where('id', $conversion->id)
                            ->update(['conversion_date_time' => $formattedDate]);
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error("Failed to parse date for conversion {$conversion->id}");
                    }
                }
            });

        Schema::table('ads_conversions', function (Blueprint $table) {
            $table->timestamp('conversion_date_time')->nullable()->change();
        });
    }
};
