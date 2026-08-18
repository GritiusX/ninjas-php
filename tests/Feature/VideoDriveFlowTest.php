<?php

use App\Models\Client;
use App\Models\ContentPiece;
use App\Models\User;
use App\Services\GoogleDriveService;
use App\Services\NotificationService;
use App\Services\WhatsAppService;

beforeEach(function () {
    $this->mock(WhatsAppService::class, fn ($mock) => $mock->shouldIgnoreMissing());
    $this->mock(NotificationService::class, fn ($mock) => $mock->shouldIgnoreMissing());
});

function makeDriveClient(array $attrs = []): Client
{
    return Client::create(array_merge(['name' => 'Cliente Drive', 'roas_goal' => '3.00'], $attrs));
}

function makeDriveEditor(): User
{
    return User::factory()->create(['role' => 'editor', 'is_active' => true]);
}

// --- submitVideo ---

it('submitVideo calls uploadVideo with the piece Client and persists link + status', function () {
    $editor = makeDriveEditor();
    $client = makeDriveClient();
    $piece  = ContentPiece::create([
        'client_id'           => $client->id,
        'concept'             => 'Pieza de prueba',
        'status'              => ContentPiece::STATUS_EDITING,
        'priority'            => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links'  => ['https://drive.google.com/test'],
        'assigned_editor_id'  => $editor->id,
    ]);

    $this->mock(GoogleDriveService::class, function ($mock) use ($client) {
        $mock->shouldReceive('uploadVideo')
            ->once()
            ->withArgs(fn ($path, $name, $passedClient, $pieceName) => $passedClient instanceof Client && $passedClient->is($client))
            ->andReturn('https://drive.google.com/file/d/abc123/view');
    });

    $video = \Illuminate\Http\UploadedFile::fake()->create('video.mp4', 100, 'video/mp4');

    $this->actingAs($editor)
        ->post(route('editor.submit-video', $piece), ['video' => $video])
        ->assertSessionHas('success');

    $piece->refresh();
    expect($piece->final_video_link)->toBe('https://drive.google.com/file/d/abc123/view');
    expect($piece->status)->toBe(ContentPiece::STATUS_INTERNAL_REVIEW);
});

// --- approveClientRevision ---

it('approveClientRevision calls moveVideoToDelivery and keeps status even if Drive throws', function () {
    $pm     = User::factory()->create(['role' => 'admin', 'is_active' => true]);
    $client = makeDriveClient();
    $piece  = ContentPiece::create([
        'client_id'          => $client->id,
        'concept'            => 'Pieza de prueba',
        'status'             => ContentPiece::STATUS_CLIENT_REVIEW,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links' => ['https://drive.google.com/test'],
        'final_video_link'   => 'https://drive.google.com/file/d/abc123/view',
    ]);

    $this->mock(GoogleDriveService::class, function ($mock) use ($client) {
        $mock->shouldReceive('moveVideoToDelivery')
            ->once()
            ->withArgs(fn ($link, $passedClient, $pieceName) => $passedClient instanceof Client && $passedClient->is($client))
            ->andThrow(new \RuntimeException('Drive caído'));
    });

    $this->actingAs($pm)
        ->post(route('pm.review.approve-client', $piece))
        ->assertRedirect(route('pm.dashboard'));

    $piece->refresh();
    expect($piece->status)->toBe(ContentPiece::STATUS_CLIENT_APPROVED);
});

// --- resolveClientFolders ---

it('resolveClientFolders reuses cached ids and never touches the Drive API', function () {
    $client = makeDriveClient([
        'drive_folder_id'             => 'root-id',
        'drive_in_progress_folder_id' => 'in-progress-id',
        'drive_final_folder_id'       => 'final-id',
    ]);

    // Instanciado sin constructor: si resolveClientFolders tocara $this->drive
    // (es decir, si volviera a buscar por nombre en vez de usar los IDs
    // cacheados), esto explotaría con un Error de propiedad no inicializada.
    $service = (new ReflectionClass(GoogleDriveService::class))->newInstanceWithoutConstructor();

    $folders = $service->resolveClientFolders($client);

    expect($folders)->toBe([
        'root'       => 'root-id',
        'inProgress' => 'in-progress-id',
        'final'      => 'final-id',
    ]);
});
