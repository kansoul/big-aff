<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('adx_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_center_id')->nullable()->constrained('business_centers')->nullOnDelete();
            $table->foreignId('team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->foreignId('main_team_id')->nullable()->constrained('main_teams')->nullOnDelete();
            $table->string('source', 50)->index();
            $table->string('account_id', 191)->index();
            $table->string('account_name')->nullable();
            $table->string('status', 50)->default('ACTIVE')->index();
            $table->boolean('is_special')->default(false);
            $table->boolean('sync_to_mcc')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['source', 'account_id'], 'adx_accounts_source_account_uid');
            $table->index(['business_center_id', 'source', 'status'], 'adx_accounts_bc_source_status_idx');
            $table->index(['team_id', 'source', 'status'], 'adx_accounts_team_source_status_idx');
            $table->index(['main_team_id', 'source', 'status'], 'adx_accounts_main_team_source_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adx_accounts');
    }
};
