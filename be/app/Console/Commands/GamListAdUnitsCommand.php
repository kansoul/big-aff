<?php

namespace App\Console\Commands;

use App\Services\Integrations\Adsense\GamAdManagerReportService;
use Illuminate\Console\Command;
use Throwable;

class GamListAdUnitsCommand extends Command
{
    protected $signature = 'gam:list-ad-units
                            {--status= : Filter by status (ACTIVE, INACTIVE, ARCHIVED)}
                            {--search= : Filter by name or ad unit code (case-insensitive substring)}';

    protected $description = 'List all ad units from Google Ad Manager';

    public function handle(GamAdManagerReportService $service): int
    {
        $this->info('Fetching ad units from GAM...');

        try {
            $adUnits = $service->fetchAdUnits();
        } catch (Throwable $e) {
            $this->error('Failed to fetch ad units: '.$e->getMessage());

            return self::FAILURE;
        }

        $statusFilter = $this->option('status');
        $searchFilter = $this->option('search');

        if ($statusFilter) {
            $adUnits = array_filter($adUnits, fn ($u) => strtoupper($u['status']) === strtoupper($statusFilter));
        }

        if ($searchFilter) {
            $needle = strtolower($searchFilter);
            $adUnits = array_filter($adUnits, fn ($u) => str_contains(strtolower($u['name']), $needle)
                || str_contains(strtolower($u['ad_unit_code']), $needle));
        }

        $adUnits = array_values($adUnits);

        if (empty($adUnits)) {
            $this->warn('No ad units found.');

            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'Name', 'Description', 'Ad Unit Code', 'Status', 'Parent ID', 'Children', 'Target Window', 'Interstitial', 'Native', 'Fluid', 'AdSense', 'Last Modified'],
            array_map(fn ($u) => [
                $u['id'],
                $u['name'],
                $u['description'] ?: '—',
                $u['ad_unit_code'],
                $u['status'],
                $u['parent_id'] ?? '—',
                $u['has_children'] ? 'Yes' : 'No',
                $u['target_window'] ?: '—',
                $u['is_interstitial'] ? 'Yes' : 'No',
                $u['is_native'] ? 'Yes' : 'No',
                $u['is_fluid'] ? 'Yes' : 'No',
                $u['adsense_enabled'] ? 'Yes' : 'No',
                $u['last_modified'] ?? '—',
            ], $adUnits),
        );

        $this->line('Total: '.count($adUnits));

        return self::SUCCESS;
    }
}
