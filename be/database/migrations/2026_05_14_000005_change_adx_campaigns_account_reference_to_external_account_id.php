<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getColumnType('adx_campaigns', 'adx_account_id') !== 'varchar') {
            $existingFks = array_column(
                DB::select("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'adx_campaigns' AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_SCHEMA = DATABASE()"),
                'CONSTRAINT_NAME',
            );

            Schema::table('adx_campaigns', function (Blueprint $table) use ($existingFks): void {
                if (in_array('adx_campaigns_adx_account_id_foreign', $existingFks, true)) {
                    $table->dropForeign('adx_campaigns_adx_account_id_foreign');
                }
                if (Schema::hasIndex('adx_campaigns', 'adx_campaigns_adx_account_campaign_idx')) {
                    $table->dropIndex('adx_campaigns_adx_account_campaign_idx');
                }
                if (Schema::hasIndex('adx_campaigns', 'adx_campaigns_source_adx_account_idx')) {
                    $table->dropIndex('adx_campaigns_source_adx_account_idx');
                }
                $table->string('adx_account_external_id', 191)->nullable()->after('source');
            });

            DB::statement('
                UPDATE adx_campaigns
                LEFT JOIN adx_accounts AS local_accounts ON adx_campaigns.adx_account_id = local_accounts.id
                LEFT JOIN adx_accounts AS external_accounts ON CAST(adx_campaigns.adx_account_id AS CHAR) = external_accounts.account_id
                SET adx_campaigns.adx_account_external_id = COALESCE(local_accounts.account_id, external_accounts.account_id)
                WHERE adx_campaigns.adx_account_id IS NOT NULL
            ');

            Schema::table('adx_campaigns', function (Blueprint $table): void {
                $table->dropColumn('adx_account_id');
            });

            Schema::table('adx_campaigns', function (Blueprint $table): void {
                $table->renameColumn('adx_account_external_id', 'adx_account_id');
            });
        }

        Schema::table('adx_campaigns', function (Blueprint $table): void {
            if (! Schema::hasIndex('adx_campaigns', 'adx_campaigns_adx_account_campaign_idx')) {
                $table->index(['adx_account_id', 'campaign_id'], 'adx_campaigns_adx_account_campaign_idx');
            }
            if (! Schema::hasIndex('adx_campaigns', 'adx_campaigns_source_adx_account_idx')) {
                $table->index(['source', 'adx_account_id'], 'adx_campaigns_source_adx_account_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('adx_campaigns', function (Blueprint $table): void {
            $table->dropIndex('adx_campaigns_adx_account_campaign_idx');
            $table->dropIndex('adx_campaigns_source_adx_account_idx');
            $table->unsignedBigInteger('adx_account_local_id')->nullable()->after('source');
        });

        DB::statement('
            UPDATE adx_campaigns
            INNER JOIN adx_accounts ON adx_campaigns.adx_account_id = adx_accounts.account_id
            SET adx_campaigns.adx_account_local_id = adx_accounts.id
            WHERE adx_campaigns.adx_account_id IS NOT NULL
        ');

        Schema::table('adx_campaigns', function (Blueprint $table): void {
            $table->dropColumn('adx_account_id');
        });

        Schema::table('adx_campaigns', function (Blueprint $table): void {
            $table->renameColumn('adx_account_local_id', 'adx_account_id');
        });

        Schema::table('adx_campaigns', function (Blueprint $table): void {
            $table->foreign('adx_account_id', 'adx_campaigns_adx_account_id_foreign')
                ->references('id')
                ->on('adx_accounts')
                ->nullOnDelete();
            $table->index(['adx_account_id', 'campaign_id'], 'adx_campaigns_adx_account_campaign_idx');
            $table->index(['source', 'adx_account_id'], 'adx_campaigns_source_adx_account_idx');
        });
    }
};
