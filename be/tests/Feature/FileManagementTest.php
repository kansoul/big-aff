<?php

namespace Tests\Feature;

use App\Enums\Permission;
use App\Models\File;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FileManagementTest extends TestCase
{
    use RefreshDatabase;

    private function authenticatedUser(): User
    {
        $role = Role::query()->create(['name' => 'admin']);
        $role->syncPermissionSlugs(Permission::values());

        $user = User::factory()->create(['role_id' => $role->id]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_guest_cannot_upload_file(): void
    {
        Storage::fake('public');

        $this->postJson('/api/files', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
        ])->assertUnauthorized();
    }

    public function test_authenticated_user_can_upload_file(): void
    {
        Storage::fake('public');

        $this->authenticatedUser();

        $response = $this->postJson('/api/files', [
            'file' => UploadedFile::fake()->image('photo.jpg', 640, 480),
            'alt_text' => 'A test photo',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.original_name', 'photo.jpg')
            ->assertJsonPath('data.alt_text', 'A test photo');

        $this->assertDatabaseHas('files', [
            'original_name' => 'photo.jpg',
            'alt_text' => 'A test photo',
        ]);
    }

    public function test_upload_requires_file(): void
    {
        $this->authenticatedUser();

        $this->postJson('/api/files', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
    }

    public function test_upload_rejects_oversized_file(): void
    {
        Storage::fake('public');

        $this->authenticatedUser();

        $this->postJson('/api/files', [
            'file' => UploadedFile::fake()->create('large.pdf', 52_000),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
    }

    public function test_authenticated_user_can_view_file(): void
    {
        $user = $this->authenticatedUser();
        $file = File::factory()->create(['user_id' => $user->id]);

        $this->getJson('/api/files/'.$file->id)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $file->id)
            ->assertJsonPath('data.original_name', $file->original_name);
    }

    public function test_authenticated_user_can_delete_file(): void
    {
        Storage::fake('public');

        $user = $this->authenticatedUser();
        $file = File::factory()->create([
            'user_id' => $user->id,
            'disk' => 'public',
        ]);

        $this->deleteJson('/api/files/'.$file->id)
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSoftDeleted('files', ['id' => $file->id]);
    }

    public function test_upload_to_specific_disk(): void
    {
        Storage::fake('s3');

        $this->authenticatedUser();

        $response = $this->postJson('/api/files', [
            'file' => UploadedFile::fake()->image('cloud.png'),
            'disk' => 's3',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.disk', 's3');

        $this->assertDatabaseHas('files', [
            'original_name' => 'cloud.png',
            'disk' => 's3',
        ]);
    }

    public function test_upload_defaults_to_configured_disk(): void
    {
        Storage::fake('public');

        $this->authenticatedUser();

        $response = $this->postJson('/api/files', [
            'file' => UploadedFile::fake()->image('default.png'),
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.disk', 'public');
    }

    public function test_upload_rejects_invalid_disk(): void
    {
        $this->authenticatedUser();

        $this->postJson('/api/files', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
            'disk' => 'ftp',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['disk']);
    }

    public function test_upload_to_custom_directory(): void
    {
        Storage::fake('public');

        $this->authenticatedUser();

        $response = $this->postJson('/api/files', [
            'file' => UploadedFile::fake()->image('avatar.png'),
            'directory' => 'avatars/users',
        ]);

        $response->assertCreated();
        $this->assertStringStartsWith('avatars/users/', $response->json('data.path'));
    }

    public function test_upload_uses_default_directory_when_not_provided(): void
    {
        Storage::fake('public');

        $this->authenticatedUser();

        $response = $this->postJson('/api/files', [
            'file' => UploadedFile::fake()->image('photo.png'),
        ]);

        $response->assertCreated();
        $this->assertStringStartsWith('uploads/', $response->json('data.path'));
    }

    public function test_upload_rejects_invalid_directory(): void
    {
        $this->authenticatedUser();

        $this->postJson('/api/files', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
            'directory' => '../etc/passwd',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['directory']);
    }

    public function test_guest_cannot_list_files(): void
    {
        $this->getJson('/api/files')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_list_files(): void
    {
        $user = $this->authenticatedUser();
        File::factory()->count(2)->create(['user_id' => $user->id]);

        $this->getJson('/api/files')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 2)
            ->assertJsonCount(2, 'data.items')
            ->assertJsonStructure([
                'data' => [
                    'items' => [
                        ['id', 'path', 'url', 'created_at'],
                    ],
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
            ]);
    }

    public function test_list_files_filters_by_user_id(): void
    {
        $user = $this->authenticatedUser();
        $other = User::factory()->create();
        File::factory()->create(['user_id' => $user->id]);
        File::factory()->create(['user_id' => $other->id]);

        $this->getJson('/api/files?'.http_build_query(['user_id' => $user->id]))
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.items.0.user_id', $user->id);
    }

    public function test_list_files_filters_by_created_at_range(): void
    {
        $user = $this->authenticatedUser();
        File::factory()->create([
            'user_id' => $user->id,
            'created_at' => Carbon::parse('2026-01-15 12:00:00'),
        ]);
        File::factory()->create([
            'user_id' => $user->id,
            'created_at' => Carbon::parse('2026-02-15 12:00:00'),
        ]);

        $this->getJson('/api/files?'.http_build_query([
            'created_from' => '2026-02-01',
            'created_to' => '2026-02-28',
        ]))
            ->assertOk()
            ->assertJsonPath('data.total', 1);
    }

    public function test_list_files_rejects_invalid_user_id(): void
    {
        $this->authenticatedUser();

        $this->getJson('/api/files?'.http_build_query(['user_id' => 999_999_999]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user_id']);
    }

    public function test_list_files_rejects_created_to_before_created_from(): void
    {
        $this->authenticatedUser();

        $this->getJson('/api/files?'.http_build_query([
            'created_from' => '2026-02-10',
            'created_to' => '2026-02-01',
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['created_to']);
    }

    public function test_list_files_paginates_with_per_page(): void
    {
        $user = $this->authenticatedUser();
        File::factory()->count(3)->create(['user_id' => $user->id]);

        $this->getJson('/api/files?'.http_build_query(['per_page' => 2, 'page' => 1]))
            ->assertOk()
            ->assertJsonPath('data.per_page', 2)
            ->assertJsonPath('data.total', 3)
            ->assertJsonPath('data.last_page', 2)
            ->assertJsonCount(2, 'data.items');

        $this->getJson('/api/files?'.http_build_query(['per_page' => 2, 'page' => 2]))
            ->assertOk()
            ->assertJsonCount(1, 'data.items');
    }

    public function test_list_files_rejects_per_page_over_max(): void
    {
        $this->authenticatedUser();

        $this->getJson('/api/files?'.http_build_query(['per_page' => 101]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['per_page']);
    }

    public function test_guest_cannot_view_file(): void
    {
        $file = File::factory()->create();

        $this->getJson('/api/files/'.$file->id)
            ->assertUnauthorized();
    }

    public function test_guest_cannot_delete_file(): void
    {
        $file = File::factory()->create();

        $this->deleteJson('/api/files/'.$file->id)
            ->assertUnauthorized();
    }
}
