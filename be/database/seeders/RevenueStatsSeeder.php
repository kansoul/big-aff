<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Models\Account;
use App\Models\CampaignReport;
use App\Models\Role;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds dummy data for the Revenue Stats screen:
 *   Teams → Accounts (owned by users) → CampaignReport (30 days of data)
 *
 * Scenarios covered:
 *   - Admin user (full access, bypasses OwnershipFilter)
 *   - Manager users each owning their own team + accounts
 *   - CampaignReport rows with both revenue (r_*) and spend (a_*) fields
 */
class RevenueStatsSeeder extends Seeder
{
    private const DAYS = 30;

    public function run(): void
    {
        $adminRole = $this->ensureAdminRole();
        $admin = $this->ensureAdmin($adminRole);

        $managerRole = $this->ensureManagerRole();

        [$manager1, $manager2] = $this->createManagers($managerRole);

        $team1 = Team::firstOrCreate(
            ['name' => 'Alpha Team'],
            ['description' => 'First test team', 'created_by' => $admin->id],
        );

        $team2 = Team::firstOrCreate(
            ['name' => 'Beta Team'],
            ['description' => 'Second test team', 'created_by' => $admin->id],
        );

        $this->seedAccountsForUser($manager1, $team1, 3);
        $this->seedAccountsForUser($manager2, $team2, 2);

        // Admin also owns one account (no team) to test the no-team scenario
        $this->seedAccountsForUser($admin, null, 1);
    }

    // -------------------------------------------------------------------------

    private function ensureAdminRole(): Role
    {
        $role = Role::firstOrCreate(
            ['name' => 'admin'],
            ['permissions' => (string) Permission::fullMask()],
        );

        if (! $role->wasRecentlyCreated) {
            $role->update(['permissions' => (string) Permission::fullMask()]);
        }

        return $role;
    }

    private function ensureAdmin(Role $adminRole): User
    {
        return User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
            ],
        );
    }

    private function ensureManagerRole(): Role
    {
        $mask = Permission::RevenueStatsView->bit()
            | Permission::RevenueReportsView->bit()
            | Permission::AdsReportView->bit();

        return Role::firstOrCreate(
            ['name' => 'manager'],
            ['permissions' => (string) $mask],
        );
    }

    /**
     * @return array{0: User, 1: User}
     */
    private function createManagers(Role $role): array
    {
        $manager1 = User::firstOrCreate(
            ['email' => 'manager1@example.com'],
            [
                'name' => 'Manager One',
                'password' => Hash::make('password'),
                'role_id' => $role->id,
            ],
        );

        $manager2 = User::firstOrCreate(
            ['email' => 'manager2@example.com'],
            [
                'name' => 'Manager Two',
                'password' => Hash::make('password'),
                'role_id' => $role->id,
            ],
        );

        return [$manager1, $manager2];
    }

    private function seedAccountsForUser(User $user, ?Team $team, int $count): void
    {
        for ($i = 1; $i <= $count; $i++) {
            $prefix = $i === 1 ? 'act_' : 'goog_';
            $externalId = $prefix.str_pad((string) $user->id, 4, '0', STR_PAD_LEFT).str_pad((string) $i, 4, '0', STR_PAD_LEFT);

            $account = Account::firstOrCreate(
                ['account_id' => $externalId],
                [
                    'account_name' => $user->name.' Account #'.$i,
                    'ads_type' => $i === 1 ? 'facebook' : 'google',
                    'status' => 'ACTIVE',
                    'team_id' => $team?->id,
                    'created_by' => $user->id,
                ],
            );

            $this->seedCampaignReports($account);
        }
    }

    private function seedCampaignReports(Account $account): void
    {
        $campaignCount = fake()->numberBetween(2, 4);

        for ($c = 1; $c <= $campaignCount; $c++) {
            $campaignId = 'camp_'.$account->account_id.'_'.str_pad((string) $c, 3, '0', STR_PAD_LEFT);
            $campaignName = ucfirst(fake()->words(fake()->numberBetween(3, 5), true));

            for ($day = self::DAYS; $day >= 0; $day--) {
                $date = now()->subDays($day)->format('Y-m-d');

                $exists = CampaignReport::where('account_id', $account->id)
                    ->where('campaign_id', $campaignId)
                    ->where('date_start', $date)
                    ->exists();

                if ($exists) {
                    continue;
                }

                CampaignReport::factory()->create([
                    'account_id' => $account->id,
                    'account_name' => $account->account_name,
                    'campaign_id' => $campaignId,
                    'campaign_name' => $campaignName,
                    'ads_type' => $account->ads_type,
                    'date_start' => $date,
                ]);
            }
        }
    }
}
