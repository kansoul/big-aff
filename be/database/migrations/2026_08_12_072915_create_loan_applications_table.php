<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_applications', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->string('campaign_id')->nullable()->index();
            $table->unsignedTinyInteger('loan_amount')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 20)->nullable();
            $table->unsignedTinyInteger('best_call_time')->nullable();
            $table->string('first_name', 50)->nullable();
            $table->string('last_name', 50)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('zip_code', 5)->nullable();
            $table->string('street_address', 120)->nullable();
            $table->unsignedTinyInteger('residence_length')->nullable();
            $table->unsignedTinyInteger('residence_status')->nullable();
            $table->unsignedTinyInteger('income_source')->nullable();
            $table->unsignedTinyInteger('employed_time')->nullable();
            $table->unsignedTinyInteger('gross_income')->nullable();
            $table->date('next_pay_date')->nullable();
            $table->unsignedTinyInteger('debt_amount')->nullable();
            $table->string('employer_name', 100)->nullable();
            $table->string('job_title', 100)->nullable();
            $table->string('work_phone', 20)->nullable();
            $table->unsignedTinyInteger('pay_frequency')->nullable();
            $table->unsignedTinyInteger('pay_method')->nullable();
            $table->text('routing_number')->nullable();
            $table->unsignedTinyInteger('account_type')->nullable();
            $table->unsignedTinyInteger('account_length')->nullable();
            $table->text('account_number')->nullable();
            $table->text('license_number')->nullable();
            $table->unsignedTinyInteger('issuing_state')->nullable();
            $table->unsignedTinyInteger('credit_score')->nullable();
            $table->text('ssn')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_applications');
    }
};
