<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table): void {
            // Steps the wizard already collects but the table had no column for.
            $table->unsignedTinyInteger('loan_purpose')->nullable()->after('loan_amount');
            // Nullable, not defaulted: "not answered yet" must stay distinct
            // from "declined" so the resume scan can land on the step.
            $table->boolean('consent_marketing')->nullable()->after('best_call_time');
            $table->string('city', 100)->nullable()->after('street_address');
            $table->string('state', 2)->nullable()->after('city');
            // Derived from the routing-number lookup, stored alongside it.
            $table->string('bank_name', 120)->nullable()->after('routing_number');
            // Attribution captured with the application, kept out of the
            // applicant payload echoed back to the browser.
            $table->string('utm_source', 64)->nullable()->after('campaign_id');
            $table->string('aff_click_id', 128)->nullable()->after('utm_source');
        });
    }

    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table): void {
            $table->dropColumn([
                'loan_purpose', 'consent_marketing', 'city', 'state',
                'bank_name', 'utm_source', 'aff_click_id',
            ]);
        });
    }
};
