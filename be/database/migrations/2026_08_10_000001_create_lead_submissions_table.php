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
        Schema::create('lead_submissions', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->nullable()->index();
            $table->string('campaign_id')->nullable();
            $table->string('adset_id')->nullable();
            $table->string('ad_id')->nullable();
            $table->string('page', 500)->nullable();

            // Loan request
            $table->string('amount')->nullable();

            // Contact
            $table->string('email')->nullable()->index();
            $table->string('phone', 32)->nullable();
            $table->string('best_call_time', 50)->nullable();
            $table->string('first_name', 100)->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('dob', 20)->nullable();

            // Residence
            $table->string('zip', 20)->nullable();
            $table->string('street')->nullable();
            $table->string('residence_length', 50)->nullable();
            $table->string('residence_status', 50)->nullable();

            // Income / employment
            $table->string('income_source', 100)->nullable();
            $table->string('employed_time', 50)->nullable();
            $table->string('gross_income', 50)->nullable();
            $table->string('next_pay_date', 20)->nullable();
            $table->string('debt', 50)->nullable();
            $table->string('employer')->nullable();
            $table->string('job_title')->nullable();
            $table->string('work_phone', 32)->nullable();
            $table->string('pay_frequency', 50)->nullable();
            $table->string('pay_method', 50)->nullable();

            // Banking — account number is stored encrypted, so it needs the extra room.
            $table->string('routing_number', 20)->nullable();
            $table->string('account_type', 50)->nullable();
            $table->string('account_length', 50)->nullable();
            $table->text('account_number')->nullable();

            // Identity — SSN is stored encrypted.
            $table->string('license_number', 50)->nullable();
            $table->string('issuing_state', 50)->nullable();
            $table->string('credit_score', 50)->nullable();
            $table->text('ssn')->nullable();

            // Anything the wizard sends that has no dedicated column.
            $table->json('extra')->nullable();

            $table->timestamp('event_time')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'created_at'], 'idx_lead_submissions_campaign_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_submissions');
    }
};
