<?php

use App\Enums\RuleActionMode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Used by: Manage Campaign Rule Settings
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_campaign_rule_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->unique();
            $table->boolean('campaign_rule_auto_enabled')->default(true);
            $table->enum('action_mode', RuleActionMode::values())->default(RuleActionMode::PAUSE->value);
            $table->text('telegram_chat_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_campaign_rule_settings');
    }
};
