<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Legacy bitmask bit => permission slug (must match App\Enums\Permission string values).
     *
     * @var array<int, string>
     */
    private const LEGACY_BIT_TO_SLUG = [
        1 => 'report.overview.view',
        2 => 'report.export',
        4 => 'settings.users.view',
        8 => 'settings.users.create',
        16 => 'settings.users.update',
        32 => 'settings.users.delete',
        64 => 'settings.roles.view',
        128 => 'settings.roles.create',
        256 => 'settings.roles.update',
        512 => 'settings.roles.delete',
        1024 => 'settings.roles.assign',
    ];

    public function up(): void
    {
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->string('permission');
            $table->timestamps();

            $table->unique(['role_id', 'permission']);
        });

        $now = now();

        foreach (DB::table('roles')->orderBy('id')->cursor() as $row) {
            $mask = (int) $row->permission_mask;

            foreach (self::LEGACY_BIT_TO_SLUG as $bit => $slug) {
                if (($mask & $bit) === $bit) {
                    DB::table('role_permissions')->insert([
                        'role_id' => $row->id,
                        'permission' => $slug,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }

        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('permission_mask');
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->unsignedBigInteger('permission_mask')->default(0)->after('name');
        });

        foreach (DB::table('roles')->orderBy('id')->cursor() as $row) {
            $mask = 0;
            $perms = DB::table('role_permissions')
                ->where('role_id', $row->id)
                ->pluck('permission');

            foreach (self::LEGACY_BIT_TO_SLUG as $bit => $slug) {
                if ($perms->contains($slug)) {
                    $mask |= $bit;
                }
            }

            DB::table('roles')->where('id', $row->id)->update(['permission_mask' => $mask]);
        }

        Schema::dropIfExists('role_permissions');
    }
};
