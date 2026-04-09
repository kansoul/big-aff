<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\PostType;
use App\Enums\PostStatus;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            if (! Schema::hasColumn('posts', 'note')) {
                $table->string('note', 255)->nullable()->after('lang');
            }
            $table->enum('status', PostStatus::values())->default('draft')->change();
            $table->enum('type', PostType::values())->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('note');
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft')->change();
            $table->string('type', 50)->nullable()->change();
        });
    }
};
