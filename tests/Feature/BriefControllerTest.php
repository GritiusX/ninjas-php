<?php

use App\Models\Client;
use App\Models\ContentPiece;
use App\Models\User;

function makeBriefPm(): User
{
    return User::factory()->create(['role' => 'admin', 'is_active' => true]);
}

function makeBriefClient(): Client
{
    return Client::create(['name' => 'Brief Client', 'roas_goal' => '3.00']);
}

function makeBriefEditor(): User
{
    return User::factory()->create(['role' => 'editor', 'is_active' => true]);
}

function makeBriefPiece(Client $client, string $status = ContentPiece::STATUS_BRIEF): ContentPiece
{
    return ContentPiece::create([
        'client_id'          => $client->id,
        'concept'            => 'Concepto inicial',
        'status'             => $status,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links' => ['https://drive.google.com/test'],
    ]);
}

// --- store (single brief) ---

it('pm can create a single brief with STATUS_BRIEF', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();

    $this->actingAs($pm)
        ->post(route('pm.brief.store'), [
            'client_id'          => $client->id,
            'development'        => 'Video mostrando el producto',
            'raw_material_links' => ['https://drive.google.com/fileA'],
        ])
        ->assertRedirect(route('pm.dashboard'));

    $piece = ContentPiece::first();
    expect($piece->status)->toBe(ContentPiece::STATUS_BRIEF);
    expect($piece->priority)->toBe(ContentPiece::PRIORITY_MEDIUM);
});

it('store allows optional deadline', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();

    $this->actingAs($pm)
        ->post(route('pm.brief.store'), [
            'client_id'          => $client->id,
            'development'        => 'Texto de desarrollo',
            'deadline'           => '2027-01-15',
            'raw_material_links' => ['https://drive.google.com/fileA'],
        ]);

    expect(ContentPiece::first()->deadline)->not->toBeNull();
});

it('store rejects invalid deadline format', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();

    $this->actingAs($pm)
        ->post(route('pm.brief.store'), [
            'client_id'          => $client->id,
            'development'        => 'Dev',
            'deadline'           => 'not-a-date',
            'raw_material_links' => ['https://drive.google.com/fileA'],
        ])
        ->assertSessionHasErrors('deadline');
});

it('store requires at least one raw_material_link', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();

    $this->actingAs($pm)
        ->post(route('pm.brief.store'), [
            'client_id'          => $client->id,
            'development'        => 'Dev',
            'raw_material_links' => [],
        ])
        ->assertSessionHasErrors('raw_material_links');
});

it('store rejects non-URL raw_material_link', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();

    $this->actingAs($pm)
        ->post(route('pm.brief.store'), [
            'client_id'          => $client->id,
            'development'        => 'Dev',
            'raw_material_links' => ['not-a-url'],
        ])
        ->assertSessionHasErrors('raw_material_links.0');
});

it('store rejects missing development field', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();

    $this->actingAs($pm)
        ->post(route('pm.brief.store'), [
            'client_id'          => $client->id,
            'raw_material_links' => ['https://drive.google.com/fileA'],
        ])
        ->assertSessionHasErrors('development');
});

// --- assign ---

it('pm can assign an editor to a brief piece', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();
    $editor = makeBriefEditor();
    $piece  = makeBriefPiece($client);

    $this->actingAs($pm)
        ->post(route('pm.brief.assign', $piece), ['editor_id' => $editor->id])
        ->assertRedirect();

    $piece->refresh();
    expect($piece->assigned_editor_id)->toBe($editor->id);
    expect($piece->status)->toBe(ContentPiece::STATUS_EDITING);
});

it('assign rejects nonexistent editor_id', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();
    $piece  = makeBriefPiece($client);

    $this->actingAs($pm)
        ->post(route('pm.brief.assign', $piece), ['editor_id' => 9999])
        ->assertSessionHasErrors('editor_id');
});

it('assign requires editor_id field', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();
    $piece  = makeBriefPiece($client);

    $this->actingAs($pm)
        ->post(route('pm.brief.assign', $piece), [])
        ->assertSessionHasErrors('editor_id');
});

// --- update ---

it('pm can update a brief piece fields', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();
    $piece  = makeBriefPiece($client);

    $this->actingAs($pm)
        ->put(route('pm.brief.update', $piece), [
            'concept'    => 'Nuevo concepto',
            'priority'   => ContentPiece::PRIORITY_HIGH,
            'is_scheduled' => false,
        ])
        ->assertRedirect();

    $piece->refresh();
    expect($piece->concept)->toBe('Nuevo concepto');
    expect($piece->priority)->toBe(ContentPiece::PRIORITY_HIGH);
});

it('update rejects invalid priority value', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();
    $piece  = makeBriefPiece($client);

    $this->actingAs($pm)
        ->put(route('pm.brief.update', $piece), [
            'priority' => 99,
        ])
        ->assertSessionHasErrors('priority');
});

// --- destroy ---

it('pm can delete a brief piece', function () {
    $pm     = makeBriefPm();
    $client = makeBriefClient();
    $piece  = makeBriefPiece($client);

    $this->actingAs($pm)
        ->delete(route('pm.brief.destroy', $piece))
        ->assertRedirect(route('pm.dashboard'));

    expect(ContentPiece::find($piece->id))->toBeNull();
});
