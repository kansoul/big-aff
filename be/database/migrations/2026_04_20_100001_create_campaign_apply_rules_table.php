<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_apply_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_rule_id')->constrained()->cascadeOnDelete();
            $table->string('sourceable_type');
            $table->unsignedBigInteger('sourceable_id');
            $table->timestamps();

            $table->unique(['sourceable_id', 'sourceable_type', 'campaign_rule_id'], 'unique_sourceable_rule');
            $table->index(['sourceable_type', 'sourceable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_apply_rules');
    }
};
