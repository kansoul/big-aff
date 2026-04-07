<?php

namespace App\Console\Commands;

use App\Enums\Permission;
use App\Models\Role;
use Illuminate\Console\Command;

class CreateRoleCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:create-role {--name=} {--permissions=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a new role with optional permissions';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $name = $this->option('name') ?? $this->ask('Enter role name');

        if (Role::where('name', $name)->exists()) {
            $this->error("Role \"{$name}\" already exists.");

            return Command::FAILURE;
        }

        $allSlugs = array_map(fn (Permission $p) => $p->value, Permission::cases());

        $permissionsOption = $this->option('permissions');

        if ($permissionsOption === '*') {
            $selectedSlugs = ['*'];
        } elseif ($permissionsOption !== null) {
            $selectedSlugs = array_values(array_filter(
                array_map('trim', explode(',', $permissionsOption)),
                fn (string $slug) => in_array($slug, $allSlugs, true),
            ));
        } else {
            $this->info('Available permissions:');
            $this->line('  [*] Full access (all current and future permissions)');

            foreach ($allSlugs as $index => $slug) {
                $this->line("  [{$index}] {$slug}");
            }

            $input = $this->ask('Enter permission numbers or * separated by commas (leave empty for no permissions)');

            $selectedSlugs = [];

            if (filled($input)) {
                foreach (array_map('trim', explode(',', $input)) as $token) {
                    if ($token === '*') {
                        $selectedSlugs = ['*'];
                        break;
                    }

                    if (isset($allSlugs[(int) $token])) {
                        $selectedSlugs[] = $allSlugs[(int) $token];
                    }
                }
            }
        }

        $role = Role::create([
            'name' => $name,
            'permissions' => Permission::slugsToMask($selectedSlugs),
        ]);

        $this->info("Role \"{$role->name}\" created successfully!");

        if (count($selectedSlugs) > 0) {
            $this->line('Assigned permissions:');
            foreach ($selectedSlugs as $slug) {
                $this->line("  - {$slug}");
            }
        }

        return Command::SUCCESS;
    }
}
