<?php

use App\Enums\UserStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('avatar_id')->nullable();
            $table->enum('status', UserStatus::values())->default(UserStatus::Active->value);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'avatar_url',
                'access',
                'sync_at',
                'parent_id',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('avatar_id')->references('id')->on('files')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['avatar_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_url')->nullable();
            $table->json('access')->nullable();
            $table->timestamp('sync_at')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('users')->nullOnDelete();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'avatar_id',
                'status',
                'description',
                'created_by',
                'deleted_at',
            ]);
        });
    }
};
