<?php

namespace App\Services\Integrations\Adsense\Traits;

trait HasAdxRowHelpers
{
    /**
     * Summarize a list of parsed AdX rows into aggregate totals.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, int|float>
     */
    private function summarizeRows(array $rows): array
    {
        $impressions = array_sum(array_column($rows, 'ad_exchange_impressions'));
        $clicks = array_sum(array_column($rows, 'ad_exchange_clicks'));
        $responsesServed = array_sum(array_column($rows, 'ad_exchange_responses_served'));
        $revenueMicros = array_sum(array_column($rows, 'ad_exchange_revenue_micros'));

        return [
            'row_count' => count($rows),
            'ad_exchange_impressions' => (int) $impressions,
            'ad_exchange_clicks' => (int) $clicks,
            'ad_exchange_responses_served' => (int) $responsesServed,
            'ad_exchange_revenue_micros' => (int) $revenueMicros,
            'ad_exchange_revenue' => $this->microsToCurrency((int) $revenueMicros),
            'ad_exchange_average_ecpm' => $impressions > 0
                ? round(($this->microsToCurrency((int) $revenueMicros) / $impressions) * 1000, 6)
                : 0.0,
            'ad_exchange_ctr' => $impressions > 0
                ? round(($clicks / $impressions) * 100, 4)
                : 0.0,
        ];
    }

    private function microsToCurrency(int $micros): float
    {
        return round($micros / 1_000_000, 6);
    }

    private function parseInteger(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        $str = preg_replace('/\..*$/', '', (string) $value);
        $normalized = preg_replace('/[^\d\-]/', '', $str ?? '');

        return $normalized === '' ? 0 : (int) $normalized;
    }

    private function parseMicros(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        return (int) round((float) $value);
    }
}
