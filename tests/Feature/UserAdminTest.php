<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

function makeAdmin(): User
{
    return User::factory()->create(['role' => 'admin', 'is_active' => true]);
}

function validUserPayload(array $overrides = []): array
{
    return array_merge([
        'name'     => 'Felipe Editor',
        'email'    => 'felipe@littleninjas.com',
        'password' => 'Secret1234',
        'role'     => 'editor',
        'is_active'=> true,
    ], $overrides);
}

// --- store ---

it('admin can create a user with hashed password', function () {
    $admin = makeAdmin();

    $this->actingAs($admin)
        ->post(route('admin.users.store'), validUserPayload())
        ->assertRedirect(route('admin.users.index'));

    $user = User::where('email', 'felipe@littleninjas.com')->first();
    expect($user)->not->toBeNull();
    expect($user->name)->toBe('Felipe Editor');
    expect(Hash::check('Secret1234', $user->password))->toBeTrue();
});

it('store rejects invalid role', function () {
    $admin = makeAdmin();

    $this->actingAs($admin)
        ->post(route('admin.users.store'), validUserPayload(['role' => 'superuser']))
        ->assertSessionHasErrors('role');
});

it('store rejects duplicate email', function () {
    $admin = makeAdmin();
    User::factory()->create(['email' => 'duplicate@test.com']);

    $this->actingAs($admin)
        ->post(route('admin.users.store'), validUserPayload(['email' => 'duplicate@test.com']))
        ->assertSessionHasErrors('email');
});

it('store rejects short password', function () {
    $admin = makeAdmin();

    $this->actingAs($admin)
        ->post(route('admin.users.store'), validUserPayload(['password' => 'short']))
        ->assertSessionHasErrors('password');
});

it('store requires name', function () {
    $admin = makeAdmin();

    $this->actingAs($admin)
        ->post(route('admin.users.store'), validUserPayload(['name' => '']))
        ->assertSessionHasErrors('name');
});

// --- update ---

it('admin can update user without changing password when field is empty', function () {
    $admin  = makeAdmin();
    $target = User::factory()->create(['role' => 'editor', 'is_active' => true, 'password' => Hash::make('OldPassword!')]);
    $oldHash = $target->password;

    $this->actingAs($admin)
        ->put(route('admin.users.update', $target), [
            'name'      => 'Updated Name',
            'email'     => $target->email,
            'role'      => 'editor',
            'is_active' => true,
            'password'  => '',
        ])
        ->assertRedirect(route('admin.users.index'));

    $target->refresh();
    expect($target->name)->toBe('Updated Name');
    expect($target->password)->toBe($oldHash);
});

it('admin can update user and change password when provided', function () {
    $admin  = makeAdmin();
    $target = User::factory()->create(['role' => 'editor', 'is_active' => true, 'password' => Hash::make('OldPassword!')]);

    $this->actingAs($admin)
        ->put(route('admin.users.update', $target), [
            'name'      => $target->name,
            'email'     => $target->email,
            'role'      => 'editor',
            'is_active' => true,
            'password'  => 'NewPassword!',
        ]);

    $target->refresh();
    expect(Hash::check('NewPassword!', $target->password))->toBeTrue();
    expect(Hash::check('OldPassword!', $target->password))->toBeFalse();
});

it('update rejects own email as duplicate (unique ignores self)', function () {
    $admin  = makeAdmin();
    $other  = User::factory()->create(['email' => 'taken@test.com']);
    $target = User::factory()->create(['role' => 'editor', 'is_active' => true]);

    $this->actingAs($admin)
        ->put(route('admin.users.update', $target), [
            'name'      => $target->name,
            'email'     => 'taken@test.com',
            'role'      => 'editor',
            'is_active' => true,
        ])
        ->assertSessionHasErrors('email');
});

it('update keeps own email without duplicate error', function () {
    $admin  = makeAdmin();
    $target = User::factory()->create(['role' => 'editor', 'is_active' => true]);

    $this->actingAs($admin)
        ->put(route('admin.users.update', $target), [
            'name'      => 'New Name',
            'email'     => $target->email,
            'role'      => 'editor',
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.users.index'));
});

// --- destroy ---

it('admin can delete another user', function () {
    $admin  = makeAdmin();
    $target = User::factory()->create(['role' => 'editor', 'is_active' => true]);

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $target))
        ->assertRedirect(route('admin.users.index'));

    expect(User::find($target->id))->toBeNull();
});

it('admin cannot delete their own account', function () {
    $admin = makeAdmin();

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $admin))
        ->assertStatus(403);
});

it('user admin routes require admin role', function () {
    $pm = User::factory()->create(['role' => 'pm', 'is_active' => true]);

    $this->actingAs($pm)
        ->post(route('admin.users.store'), validUserPayload())
        ->assertRedirect(route('dashboard'));
});
