<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Enforce that a user with role 'leader' or 'member' can only belong to one team.
 *
 * Strategy: add a nullable `single_team_key` column.
 * - For leader/member rows: set to `user_id` (unique → prevents joining a second team).
 * - For manager rows: set to NULL (NULLs are never considered duplicates → managers may be in many teams).
 *
 * The application layer must populate this column on every insert/update of team_user.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_user', function (Blueprint $table) {
            $table->unsignedBigInteger('single_team_key')->nullable()->after('team_role');
            $table->unique('single_team_key', 'team_user_single_team_unique');
        });
    }

    public function down(): void
    {
        Schema::table('team_user', function (Blueprint $table) {
            $table->dropUnique('team_user_single_team_unique');
            $table->dropColumn('single_team_key');
        });
    }
};
