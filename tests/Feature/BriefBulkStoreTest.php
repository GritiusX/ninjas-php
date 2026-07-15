<?php

use App\Models\Client;
use App\Models\ContentPiece;
use App\Models\User;

function makePm(): User
{
    return User::factory()->create(['role' => 'admin', 'is_active' => true]);
}

function makeClient(): Client
{
    return Client::create(['name' => 'Test Client', 'roas_goal' => '3.00']);
}

function makeEditor(): User
{
    return User::factory()->create(['role' => 'editor', 'is_active' => true]);
}

function bulkRow(int $clientId, ?int $editorId = null): array
{
    return [
        'client_id'          => $clientId,
        'concept'            => 'Concepto de prueba',
        'development'        => 'Desarrollo del video',
        'brief_notes'        => null,
        'deadline'           => null,
        'raw_material_links' => ['https://drive.google.com/file/test'],
        'assigned_editor_id' => $editorId,
    ];
}

it('creates pieces with STATUS_BRIEF when no editor assigned', function () {
    $pm     = makePm();
    $client = makeClient();

    $this->actingAs($pm)
        ->post(route('pm.brief.bulk-store'), [
            'rows' => [bulkRow($client->id)],
        ])
        ->assertRedirect(route('pm.dashboard'));

    $piece = ContentPiece::first();
    expect($piece->status)->toBe(ContentPiece::STATUS_BRIEF);
    expect($piece->assigned_editor_id)->toBeNull();
});

it('creates pieces with STATUS_EDITING when editor is assigned', function () {
    $pm     = makePm();
    $client = makeClient();
    $editor = makeEditor();

    $this->actingAs($pm)
        ->post(route('pm.brief.bulk-store'), [
            'rows' => [bulkRow($client->id, $editor->id)],
        ])
        ->assertRedirect(route('pm.dashboard'));

    $piece = ContentPiece::first();
    expect($piece->status)->toBe(ContentPiece::STATUS_EDITING);
    expect($piece->assigned_editor_id)->toBe($editor->id);
});

it('creates multiple pieces in one bulk request', function () {
    $pm     = makePm();
    $client = makeClient();
    $editor = makeEditor();

    $this->actingAs($pm)
        ->post(route('pm.brief.bulk-store'), [
            'rows' => [
                bulkRow($client->id),
                bulkRow($client->id, $editor->id),
                bulkRow($client->id),
            ],
        ])
        ->assertRedirect(route('pm.dashboard'));

    expect(ContentPiece::count())->toBe(3);
    expect(ContentPiece::where('status', ContentPiece::STATUS_BRIEF)->count())->toBe(2);
    expect(ContentPiece::where('status', ContentPiece::STATUS_EDITING)->count())->toBe(1);
});

it('rejects bulk store with invalid client_id', function () {
    $pm = makePm();

    $this->actingAs($pm)
        ->post(route('pm.brief.bulk-store'), [
            'rows' => [bulkRow(9999)],
        ])
        ->assertSessionHasErrors('rows.0.client_id');
});

it('rejects bulk store with invalid editor_id', function () {
    $pm     = makePm();
    $client = makeClient();

    $row              = bulkRow($client->id);
    $row['assigned_editor_id'] = 9999;

    $this->actingAs($pm)
        ->post(route('pm.brief.bulk-store'), [
            'rows' => [$row],
        ])
        ->assertSessionHasErrors('rows.0.assigned_editor_id');
});

it('rejects bulk store when rows array is empty', function () {
    $pm = makePm();

    $this->actingAs($pm)
        ->post(route('pm.brief.bulk-store'), ['rows' => []])
        ->assertSessionHasErrors('rows');
});

it('requires authentication for bulk store', function () {
    $this->post(route('pm.brief.bulk-store'), ['rows' => []])
        ->assertRedirect(route('login'));
});
