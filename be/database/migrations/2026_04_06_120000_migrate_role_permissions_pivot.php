<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->string('permissions', 50)->default('0')->after('name');
        });

        DB::table('roles')->orderBy('id')->each(function (object $row) {
            DB::table('roles')
                ->where('id', $row->id)
                ->update(['permissions' => (string) ((int) $row->permission_mask)]);
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('permission_mask');
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->unsignedBigInteger('permission_mask')->default(0)->after('name');
        });

        DB::table('roles')->orderBy('id')->each(function (object $row) {
            DB::table('roles')
                ->where('id', $row->id)
                ->update(['permission_mask' => (int) $row->permissions]);
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('permissions');
        });
    }
};
