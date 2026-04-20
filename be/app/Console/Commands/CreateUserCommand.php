<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateUserCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:create-user {--name=} {--email=} {--password=} {--role_id=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a new user with the provided credentials';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $name = $this->option('name') ?? $this->ask('Enter user name');
        $email = $this->option('email') ?? $this->ask('Enter user email');
        $roleId = $this->option('role_id') ?? $this->ask('Enter user role_id');

        while (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email format. Please try again.');
            $email = $this->ask('Enter user email');
        }

        $password = $this->option('password') ?? $this->secret('Enter user password');

        if (User::where('email', $email)->exists()) {
            $this->error("User with email {$email} already exists.");

            return Command::FAILURE;
        }
        if (!Role::whereId($roleId)->exists()) {
            $this->error("Role Id {$roleId} not exists.");

            return Command::FAILURE;
        }
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role_id' => $roleId,
        ]);

        $this->info("User {$user->name} created successfully!");

        return Command::SUCCESS;
    }
}
