<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $isMysql = DB::getDriverName() === 'mysql';

        Schema::create('event_clicks', function (Blueprint $table) use ($isMysql) {
            $isMysql ? $table->unsignedBigInteger('id')->autoIncrement() : $table->id();
            $table->uuid('session_id')->nullable()->index();
            $table->unsignedBigInteger('link_data_id')->nullable();
            $table->string('campaign_id')->nullable();
            $table->string('adset_id')->nullable();
            $table->string('ad_id')->nullable();
            $table->enum('type', ['click_keyword', 'click_ad'])->nullable();
            $table->enum('page', ['article', 'search'])->nullable();
            $table->string('keyword_clicked', 750)->nullable();
            $table->timestamp('event_time')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['link_data_id', 'created_at'], 'idx_event_clicks_link_date');

            if ($isMysql) {
                $table->primary(['id', 'created_at']);
            }
        });

        if ($isMysql) {
            DB::statement("
            ALTER TABLE `event_clicks`
            PARTITION BY RANGE (UNIX_TIMESTAMP(`created_at`)) (
                PARTITION p202601 VALUES LESS THAN (UNIX_TIMESTAMP('2026-02-01 00:00:00')),
                PARTITION p202602 VALUES LESS THAN (UNIX_TIMESTAMP('2026-03-01 00:00:00')),
                PARTITION p202603 VALUES LESS THAN (UNIX_TIMESTAMP('2026-04-01 00:00:00')),
                PARTITION p202604 VALUES LESS THAN (UNIX_TIMESTAMP('2026-05-01 00:00:00')),
                PARTITION p202605 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-01 00:00:00')),
                PARTITION p202606 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-01 00:00:00')),
                PARTITION p202607 VALUES LESS THAN (UNIX_TIMESTAMP('2026-08-01 00:00:00')),
                PARTITION p202608 VALUES LESS THAN (UNIX_TIMESTAMP('2026-09-01 00:00:00')),
                PARTITION p202609 VALUES LESS THAN (UNIX_TIMESTAMP('2026-10-01 00:00:00')),
                PARTITION p202610 VALUES LESS THAN (UNIX_TIMESTAMP('2026-11-01 00:00:00')),
                PARTITION p202611 VALUES LESS THAN (UNIX_TIMESTAMP('2026-12-01 00:00:00')),
                PARTITION p202612 VALUES LESS THAN (UNIX_TIMESTAMP('2027-01-01 00:00:00')),
                PARTITION p_future VALUES LESS THAN MAXVALUE
            )
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('event_clicks');
    }
};
