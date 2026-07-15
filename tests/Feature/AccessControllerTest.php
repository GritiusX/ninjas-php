<?php

use App\Models\Client;
use App\Models\TemporaryAccess;
use App\Models\User;

function makeAccessAdmin(): User
{
    return User::factory()->create(['role' => 'admin', 'is_active' => true]);
}

function makeAccessEditor(): User
{
    return User::factory()->create(['role' => 'editor', 'is_active' => true]);
}

function makeAccessClient(): Client
{
    return Client::create(['name' => 'Access Client', 'roas_goal' => '3.00']);
}

// --- grant ---

it('admin can grant access to an editor for a client', function () {
    $admin  = makeAccessAdmin();
    $editor = makeAccessEditor();
    $client = makeAccessClient();

    $this->actingAs($admin)
        ->post(route('admin.access.grant'), [
            'user_id'   => $editor->id,
            'client_id' => $client->id,
        ])
        ->assertRedirect();

    expect(TemporaryAccess::where('user_id', $editor->id)->where('client_id', $client->id)->exists())->toBeTrue();
});

it('grant is idempotent — does not create duplicate access records', function () {
    $admin  = makeAccessAdmin();
    $editor = makeAccessEditor();
    $client = makeAccessClient();

    $this->actingAs($admin)
        ->post(route('admin.access.grant'), ['user_id' => $editor->id, 'client_id' => $client->id]);

    $this->actingAs($admin)
        ->post(route('admin.access.grant'), ['user_id' => $editor->id, 'client_id' => $client->id]);

    expect(TemporaryAccess::where('user_id', $editor->id)->where('client_id', $client->id)->count())->toBe(1);
});

it('grant stores expires_at when provided', function () {
    $admin     = makeAccessAdmin();
    $editor    = makeAccessEditor();
    $client    = makeAccessClient();
    $expiresAt = now()->addDays(7)->toDateTimeString();

    $this->actingAs($admin)
        ->post(route('admin.access.grant'), [
            'user_id'    => $editor->id,
            'client_id'  => $client->id,
            'expires_at' => $expiresAt,
        ]);

    $access = TemporaryAccess::first();
    expect($access->expires_at)->not->toBeNull();
});

it('grant with no expires_at creates permanent access', function () {
    $admin  = makeAccessAdmin();
    $editor = makeAccessEditor();
    $client = makeAccessClient();

    $this->actingAs($admin)
        ->post(route('admin.access.grant'), [
            'user_id'   => $editor->id,
            'client_id' => $client->id,
        ]);

    $access = TemporaryAccess::first();
    expect($access->expires_at)->toBeNull();
});

it('grant rejects expires_at in the past', function () {
    $admin  = makeAccessAdmin();
    $editor = makeAccessEditor();
    $client = makeAccessClient();

    $this->actingAs($admin)
        ->post(route('admin.access.grant'), [
            'user_id'    => $editor->id,
            'client_id'  => $client->id,
            'expires_at' => now()->subDay()->toDateTimeString(),
        ])
        ->assertSessionHasErrors('expires_at');
});

it('grant rejects nonexistent user_id', function () {
    $admin  = makeAccessAdmin();
    $client = makeAccessClient();

    $this->actingAs($admin)
        ->post(route('admin.access.grant'), [
            'user_id'   => 9999,
            'client_id' => $client->id,
        ])
        ->assertSessionHasErrors('user_id');
});

it('grant rejects nonexistent client_id', function () {
    $admin  = makeAccessAdmin();
    $editor = makeAccessEditor();

    $this->actingAs($admin)
        ->post(route('admin.access.grant'), [
            'user_id'   => $editor->id,
            'client_id' => 9999,
        ])
        ->assertSessionHasErrors('client_id');
});

// --- revoke ---

it('admin can revoke an access record', function () {
    $admin  = makeAccessAdmin();
    $editor = makeAccessEditor();
    $client = makeAccessClient();

    $access = TemporaryAccess::create([
        'user_id'    => $editor->id,
        'client_id'  => $client->id,
        'granted_by' => $admin->id,
        'expires_at' => null,
    ]);

    $this->actingAs($admin)
        ->delete(route('admin.access.revoke', $access))
        ->assertRedirect();

    expect(TemporaryAccess::find($access->id))->toBeNull();
});

// --- canAccessClient (User model) ---

it('admin always has access to any client', function () {
    $admin  = makeAccessAdmin();
    $client = makeAccessClient();

    expect($admin->canAccessClient($client->id))->toBeTrue();
});

it('editor without access record cannot access client', function () {
    $editor = makeAccessEditor();
    $client = makeAccessClient();

    expect($editor->canAccessClient($client->id))->toBeFalse();
});

it('editor with active permanent access can access client', function () {
    $admin  = makeAccessAdmin();
    $editor = makeAccessEditor();
    $client = makeAccessClient();

    TemporaryAccess::create([
        'user_id'    => $editor->id,
        'client_id'  => $client->id,
        'granted_by' => $admin->id,
        'expires_at' => null,
    ]);

    expect($editor->canAccessClient($client->id))->toBeTrue();
});

it('editor with expired access cannot access client', function () {
    $admin  = makeAccessAdmin();
    $editor = makeAccessEditor();
    $client = makeAccessClient();

    TemporaryAccess::create([
        'user_id'    => $editor->id,
        'client_id'  => $client->id,
        'granted_by' => $admin->id,
        'expires_at' => now()->subHour(),
    ]);

    expect($editor->canAccessClient($client->id))->toBeFalse();
});

it('access routes require admin role', function () {
    $pm = User::factory()->create(['role' => 'pm', 'is_active' => true]);

    $this->actingAs($pm)
        ->post(route('admin.access.grant'), ['user_id' => 1, 'client_id' => 1])
        ->assertRedirect(route('dashboard'));
});
