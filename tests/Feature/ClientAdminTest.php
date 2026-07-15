<?php

use App\Models\Client;
use App\Models\User;

function makeClientAdmin(): User
{
    return User::factory()->create(['role' => 'admin', 'is_active' => true]);
}

function validClientPayload(array $overrides = []): array
{
    return array_merge([
        'name'      => 'Aura Natural',
        'roas_goal' => '3.00',
    ], $overrides);
}

// --- store ---

it('admin can create a client with required fields only', function () {
    $admin = makeClientAdmin();

    $this->actingAs($admin)
        ->post(route('admin.clients.store'), validClientPayload())
        ->assertRedirect(route('admin.clients.index'));

    expect(Client::where('name', 'Aura Natural')->exists())->toBeTrue();
});

it('store persists optional contact fields', function () {
    $admin = makeClientAdmin();

    $this->actingAs($admin)
        ->post(route('admin.clients.store'), validClientPayload([
            'contact_name'  => 'Juan Pérez',
            'contact_email' => 'juan@aura.com',
            'whatsapp_number' => '+54 9 11 1234-5678',
        ]));

    $client = Client::first();
    expect($client->contact_name)->toBe('Juan Pérez');
    expect($client->contact_email)->toBe('juan@aura.com');
    expect($client->whatsapp_number)->toBe('+54 9 11 1234-5678');
});

it('store requires name', function () {
    $admin = makeClientAdmin();

    $this->actingAs($admin)
        ->post(route('admin.clients.store'), validClientPayload(['name' => '']))
        ->assertSessionHasErrors('name');
});

it('store requires roas_goal to be numeric and non-negative', function () {
    $admin = makeClientAdmin();

    $this->actingAs($admin)
        ->post(route('admin.clients.store'), validClientPayload(['roas_goal' => '-1']))
        ->assertSessionHasErrors('roas_goal');

    $this->actingAs($admin)
        ->post(route('admin.clients.store'), validClientPayload(['roas_goal' => 'abc']))
        ->assertSessionHasErrors('roas_goal');
});

it('store rejects invalid contact_email format', function () {
    $admin = makeClientAdmin();

    $this->actingAs($admin)
        ->post(route('admin.clients.store'), validClientPayload(['contact_email' => 'not-an-email']))
        ->assertSessionHasErrors('contact_email');
});

// --- update ---

it('admin can update a client', function () {
    $admin  = makeClientAdmin();
    $client = Client::create(['name' => 'Old Name', 'roas_goal' => '2.00']);

    $this->actingAs($admin)
        ->put(route('admin.clients.update', $client), validClientPayload([
            'name'      => 'New Name',
            'roas_goal' => '4.00',
        ]))
        ->assertRedirect(route('admin.clients.index'));

    $client->refresh();
    expect($client->name)->toBe('New Name');
    expect((float) $client->roas_goal)->toBe(4.00);
});

it('update preserves existing meta_access_token when empty string sent', function () {
    $admin  = makeClientAdmin();
    $client = Client::create([
        'name'             => 'Aura',
        'roas_goal'        => '3.00',
        'meta_access_token'=> 'secret_token_abc123',
    ]);

    $this->actingAs($admin)
        ->put(route('admin.clients.update', $client), validClientPayload([
            'name'             => 'Aura',
            'meta_access_token'=> '',
        ]));

    $client->refresh();
    expect($client->meta_access_token)->toBe('secret_token_abc123');
});

it('update overwrites meta_access_token when new value provided', function () {
    $admin  = makeClientAdmin();
    $client = Client::create([
        'name'             => 'Aura',
        'roas_goal'        => '3.00',
        'meta_access_token'=> 'old_token',
    ]);

    $this->actingAs($admin)
        ->put(route('admin.clients.update', $client), validClientPayload([
            'name'             => 'Aura',
            'meta_access_token'=> 'new_token_xyz',
        ]));

    $client->refresh();
    expect($client->meta_access_token)->toBe('new_token_xyz');
});

// --- destroy ---

it('admin can delete a client', function () {
    $admin  = makeClientAdmin();
    $client = Client::create(['name' => 'ToDelete', 'roas_goal' => '3.00']);

    $this->actingAs($admin)
        ->delete(route('admin.clients.destroy', $client))
        ->assertRedirect(route('admin.clients.index'));

    expect(Client::find($client->id))->toBeNull();
});

it('client routes require admin role', function () {
    $pm = User::factory()->create(['role' => 'pm', 'is_active' => true]);

    $this->actingAs($pm)
        ->post(route('admin.clients.store'), validClientPayload())
        ->assertRedirect(route('dashboard'));
});
