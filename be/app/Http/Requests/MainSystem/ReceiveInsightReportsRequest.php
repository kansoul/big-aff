<?php

namespace App\Http\Requests\MainSystem;

use Illuminate\Foundation\Http\FormRequest;

class ReceiveInsightReportsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'main_team_id' => ['required', 'integer', 'exists:main_teams,id'],
            'accounts' => ['required', 'array'],
            'accounts.*.account_id' => ['required', 'string', 'max:255'],
            'accounts.*.account_name' => ['nullable', 'string', 'max:255'],
            'accounts.*.ads_type' => ['required', 'string', 'max:50'],
            'accounts.*.status' => ['nullable', 'string', 'max:50'],
            'accounts.*.is_special' => ['nullable', 'boolean'],
            'accounts.*.sync_to_mcc' => ['nullable', 'boolean'],

            'campaigns' => ['required', 'array'],
            'campaigns.*.account_id' => ['nullable', 'string', 'max:255'],
            'campaigns.*.ads_type' => ['required', 'string', 'max:50'],
            'campaigns.*.campaign_id' => ['required', 'string', 'max:255'],
            'campaigns.*.campaign_name' => ['nullable', 'string', 'max:255'],
            'campaigns.*.daily_budget' => ['nullable', 'numeric'],
            'campaigns.*.lifetime_budget' => ['nullable', 'numeric'],
            'campaigns.*.status' => ['nullable', 'string', 'max:50'],
            'campaigns.*.start_time' => ['nullable', 'date'],
            'campaigns.*.stop_time' => ['nullable', 'date'],
            'campaigns.*.created_time' => ['nullable', 'date'],
            'campaigns.*.updated_time' => ['nullable', 'date'],

            'insights' => ['required', 'array'],
            'insights.*.account_id' => ['required', 'string', 'max:255'],
            'insights.*.campaign_id' => ['required', 'string', 'max:255'],
            'insights.*.date_start' => ['required', 'date'],
            'insights.*.impressions' => ['nullable', 'integer', 'min:0'],
            'insights.*.reach' => ['nullable', 'integer', 'min:0'],
            'insights.*.clicks' => ['nullable', 'integer', 'min:0'],
            'insights.*.ad_clicks' => ['nullable', 'integer', 'min:0'],
            'insights.*.article_views' => ['nullable', 'integer', 'min:0'],
            'insights.*.search_views' => ['nullable', 'integer', 'min:0'],
            'insights.*.search_clicks' => ['nullable', 'integer', 'min:0'],
            'insights.*.cpa' => ['nullable', 'numeric'],
            'insights.*.ctr_link' => ['nullable', 'numeric'],
            'insights.*.cpc_link' => ['nullable', 'numeric'],
            'insights.*.spend' => ['nullable', 'numeric'],
            'insights.*.cpc' => ['nullable', 'numeric'],
            'insights.*.cpm' => ['nullable', 'numeric'],
            'insights.*.ctr' => ['nullable', 'numeric'],
            'insights.*.frequency' => ['nullable', 'numeric'],
            'insights.*.spend_type' => ['nullable', 'string', 'max:50'],
        ];
    }
}
