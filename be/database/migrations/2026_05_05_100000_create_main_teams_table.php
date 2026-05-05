<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('main_teams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('token', 128)->unique();
            $table->boolean('sync_campaign_reports')->default(false);
            $table->timestamps();
        });

        Schema::table('accounts', function (Blueprint $table) {
            $table->foreignId('main_team_id')
                ->nullable()
                ->after('team_id')
                ->constrained('main_teams')
                ->nullOnDelete();
        });

        Schema::table('channels', function (Blueprint $table) {
            $table->foreignId('main_team_id')
                ->nullable()
                ->after('id')
                ->constrained('main_teams')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->dropConstrainedForeignId('main_team_id');
        });

        Schema::table('accounts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('main_team_id');
        });

        Schema::dropIfExists('main_teams');
    }
};
