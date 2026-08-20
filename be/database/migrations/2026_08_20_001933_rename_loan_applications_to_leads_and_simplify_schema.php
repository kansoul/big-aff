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
        if (Schema::hasTable('loan_applications')) {
            Schema::rename('loan_applications', 'leads');
        }

        Schema::table('leads', function (Blueprint $table): void {
            $table->dropIndex('loan_applications_session_id_index');
            $table->dropColumn([
                'public_id', 'campaign_id', 'adset_id', 'ad_id', 'utm_source', 'aff_click_id',
                'loan_amount', 'loan_purpose', 'best_call_time', 'consent_marketing',
                'residence_length', 'residence_status', 'income_source', 'employed_time',
                'gross_income', 'next_pay_date', 'debt_amount', 'employer_name', 'job_title',
                'work_phone', 'pay_frequency', 'pay_method', 'routing_number', 'bank_name',
                'account_type', 'account_length', 'account_number', 'license_number',
                'issuing_state', 'credit_score', 'ssn', 'completed_at',
            ]);
            $table->renameColumn('phone', 'cell_phone');
            $table->renameColumn('street_address', 'address');
            $table->renameColumn('zip_code', 'zip');
            $table->string('website_url', 2048)->nullable()->after('session_id');
            $table->unique('session_id');
            $table->foreign('session_id')->references('session_id')->on('tracking_sessions')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropForeign(['session_id']);
            $table->dropUnique(['session_id']);
            $table->index('session_id');
            $table->dropColumn('website_url');
            $table->renameColumn('cell_phone', 'phone');
            $table->renameColumn('address', 'street_address');
            $table->renameColumn('zip', 'zip_code');
        });

        Schema::rename('leads', 'loan_applications');
    }
};
