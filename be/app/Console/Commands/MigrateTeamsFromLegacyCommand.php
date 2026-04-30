<?php

namespace App\Console\Commands;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;

class MigrateTeamsFromLegacyCommand extends Command
{
    protected $signature = 'app:migrate-teams-from-legacy {--truncate : Remove all teams and users created by this command}';

    protected $description = 'Migrate legacy users into teams. Use --truncate to undo.';

    private const LEADER_PASSWORD = 'nexamedia@888';

    private const MEMBER_ROLE_ID = 2;

    private const LEADER_ROLE_ID = 6;

    /** @var array<string, array{leader_email: string, leader_name: string, members: array<string>}> */
    private const TEAMS = [
        'team_nexa' => [
            'leader_email' => 'team_nexa_leader@nexamedia.io',
            'leader_name' => 'Team Nexa Leader',
            'members' => [
                'anhdo.nexa@nexamedia.io',
                'anhduc.nexa@nexamedia.io',
                'demo.nexa@nexamedia.io',
                'dev.nexa@nexamedia.io',
                'dong.nexa@nexamedia.io',
                'duan.nexa@nexamedia.io',
                'duc.nexa@nexamedia.io',
                'feed1.nexa@nexamedia.io',
                'giang.nexa@nexamedia.io',
                'hoaihoai.nexa@nexamedia.io',
                'longvu.nexa@nexamedia.io',
                'minh.nexa@nexamedia.io',
                'nexa004@nexamedia.io',
                'nexa006@nexamedia.io',
                'nexa007@nexamedia.io',
                'nexa008@nexamedia.io',
                'nexa009@nexamedia.io',
                'nexa010@nexamedia.io',
                'nexa014@nexamedia.io',
                'nexa015@nexamedia.io',
                'nexa016@nexamedia.io',
                'nexa017@nexamedia.io',
                'nexa018@nexamedia.io',
                'nexateam1@nexamedia.io',
                'nexateam8@nexamedia.io',
                'ngoclong.nexa@nexamdia.io',
                'nguyentai.nexa@nexamedia.io',
                'paul.nexa@nexamedia.io',
                'tannexa@nexamedia.io',
                'team8nexa.mem1@nexamedia.io',
                'team8nexa.mem2@nexamedia.io',
                'team8nexa.mem3@nexamedia.io',
                'tientuan.nexa@nexamedia.io',
                'trung.nexa@nexamedia.io',
                'vanthu.nexa@nexamedia.io',
                'xuannghianexa@nexamedia.io',
            ],
        ],
        'team10' => [
            'leader_email' => 'team10_leader@nexamedia.io',
            'leader_name' => 'Team10 Leader',
            'members' => [
                'do.nexa@nexamedia.io',
                'team10.2lead@nexamedia.io',
                'team10.2mem1@nexamedia.io',
                'team10.2mem2@nexamedia.io',
                'team10.2mem3@nexamedia.io',
                'team10.2mem4@nexamedia.io',
                'team10.3lead1@nexamedia.io',
                'team10.3lead2@nexamedia.io',
                'team10.3mem1@nexamedia.io',
                'team10.3mem2@nexamedia.io',
                'team10.3mem3@nexamedia.io',
                'team10.3mem5@nexamedia.io',
                'team10.3mem6@nexamedia.io',
                'team10.3mem7@nexamedia.io',
                'team10.3mem8@nexamedia.io',
                'team10group@nexamedia.io',
                'team10lead@nexamedia.io',
                'team10mem1@nexamedia.io',
                'team10mem2@nexamedia.io',
                'team10mem3@nexamedia.io',
                'team10mem4@nexamedia.io',
                'team10mem5@nexamedia.io',
                'team10mem6@nexamedia.io',
                'team10mem7@nexamedia.io',
            ],
        ],
        'team_gg' => [
            'leader_email' => 'team_gg_leader@nexamedia.io',
            'leader_name' => 'Team GG Leader',
            'members' => [
                'han.nexa@nexamedia.io',
                'hd.nexa@nexamedia.io',
                'mac.nexa@nexamedia.io',
                'quannguyen.nexa@nexamedia.io',
                'tham.nexa@nexamedia.io',
                'xuanhoa.nexa@nexamedia.io',
            ],
        ],
    ];

    /** Emails of leader accounts created by this command (not pre-existing users). */
    private const CREATED_LEADER_EMAILS = [
        'team_nexa_leader@nexamedia.io',
        'team10_leader@nexamedia.io',
        'team_gg_leader@nexamedia.io',
    ];

    /** Team names created by this command. */
    private const TEAM_NAMES = ['team_nexa', 'team10', 'team_gg', 'team_huynh'];

    public function handle(): int
    {
        if ($this->option('truncate')) {
            return $this->truncate();
        }

        return $this->migrate();
    }

    private function migrate(): int
    {
        $admin = User::query()->first();

        foreach (self::TEAMS as $teamName => $config) {
            $leader = $this->ensureLeader($config['leader_email'], $config['leader_name'], $admin);
            $team = $this->ensureTeam($teamName, $admin);

            $this->attachToTeam($team, $leader, TeamRole::LEADER);

            $members = $this->resolveAndUpdateMembers($config['members']);

            foreach ($members as $member) {
                $this->attachToTeam($team, $member, TeamRole::MEMBER);
                $this->ensureParentChild($leader, $member);
            }

            $this->info("Team [{$teamName}]: leader={$leader->email}, members=".count($members));
        }

        $this->migrateTeamHuynh($admin);

        return self::SUCCESS;
    }

    private function migrateTeamHuynh(User $admin): void
    {
        $leader = User::query()->where('email', 'huynh.nexa@nexamedia.io')->firstOrFail();
        $leader->update(['role_id' => self::LEADER_ROLE_ID]);

        $team = $this->ensureTeam('team_huynh', $admin);
        $this->attachToTeam($team, $leader, TeamRole::LEADER);

        $member = User::query()->where('email', 'sun.nexa@nexamedia.io')->firstOrFail();
        $member->update(['role_id' => self::MEMBER_ROLE_ID]);

        $this->attachToTeam($team, $member, TeamRole::MEMBER);
        $this->ensureParentChild($leader, $member);

        $this->info('Team [team_huynh]: leader=huynh.nexa@nexamedia.io, members=1');
    }

    private function truncate(): int
    {
        if (! $this->confirm('This will delete the created teams, leader accounts, team_user rows, and user_parent_child rows. Continue?')) {
            return self::FAILURE;
        }

        // Remove team_user + user_parent_child for created leader accounts
        $createdLeaders = User::query()->whereIn('email', self::CREATED_LEADER_EMAILS)->get();
        foreach ($createdLeaders as $leader) {
            UserParentChild::query()->where('parent_user_id', $leader->id)->delete();
        }

        // Remove team_user + user_parent_child for huynh (team_huynh leader)
        $huynhLeader = User::query()->where('email', 'huynh.nexa@nexamedia.io')->first();
        if ($huynhLeader) {
            UserParentChild::query()->where('parent_user_id', $huynhLeader->id)->delete();
        }

        // Delete the teams (cascades team_user via the pivot detach)
        $teams = Team::query()->whereIn('name', self::TEAM_NAMES)->get();
        foreach ($teams as $team) {
            $team->users()->detach();
            $team->delete();
        }

        // Delete the newly created leader accounts
        User::query()->whereIn('email', self::CREATED_LEADER_EMAILS)->delete();

        // Revert member role_id — we can't know the original role, so we skip that.
        // Warn the user to handle it manually if needed.
        $this->warn('Note: member role_id values were NOT reverted. Revert manually if needed.');
        $this->info('Truncate complete.');

        return self::SUCCESS;
    }

    private function ensureLeader(string $email, string $name, User $admin): User
    {
        return User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make(self::LEADER_PASSWORD),
                'role_id' => self::LEADER_ROLE_ID,
                'created_by' => $admin->id,
            ],
        );
    }

    private function ensureTeam(string $name, User $admin): Team
    {
        return Team::query()->firstOrCreate(
            ['name' => $name],
            [
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ],
        );
    }

    private function attachToTeam(Team $team, User $user, TeamRole $role): void
    {
        $team->users()->syncWithoutDetaching([
            $user->id => [
                'team_role' => $role->value,
                'joined_at' => now(),
                'single_team_key' => $role === TeamRole::MANAGER ? null : $user->id,
            ],
        ]);
    }

    /**
     * @param  array<string>  $emails
     * @return list<User>
     */
    private function resolveAndUpdateMembers(array $emails): array
    {
        /** @var Collection<int, User> $users */
        $users = User::query()->whereIn('email', $emails)->get();

        foreach ($users as $user) {
            $user->update(['role_id' => self::MEMBER_ROLE_ID]);
        }

        $missing = array_diff($emails, $users->pluck('email')->all());
        if (! empty($missing)) {
            $this->warn('Missing users (skipped): '.implode(', ', $missing));
        }

        return $users->all();
    }

    private function ensureParentChild(User $leader, User $member): void
    {
        UserParentChild::query()->firstOrCreate([
            'parent_user_id' => $leader->id,
            'child_user_id' => $member->id,
        ]);
    }
}
