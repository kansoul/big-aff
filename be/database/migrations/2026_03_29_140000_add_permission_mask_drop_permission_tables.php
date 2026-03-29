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
        Schema::dropIfExists('role_permission');
        Schema::dropIfExists('permissions');

        if (Schema::hasTable('roles') && ! Schema::hasColumn('roles', 'permission_mask')) {
            Schema::table('roles', function (Blueprint $table): void {
                $table->unsignedBigInteger('permission_mask')->default(0);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('roles') && Schema::hasColumn('roles', 'permission_mask')) {
            Schema::table('roles', function (Blueprint $table): void {
                $table->dropColumn('permission_mask');
            });
        }

        // Do not recreate permissions / pivot; those were removed by design.
    }
};
