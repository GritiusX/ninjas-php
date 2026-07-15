<?php

use App\Models\Client;
use App\Models\User;

function makeWhatsAppPm(): User
{
    return User::factory()->create(['role' => 'admin', 'is_active' => true]);
}

function makeWhatsAppClient(?string $number = null): Client
{
    return Client::create([
        'name'             => 'Test Client WA',
        'roas_goal'        => '3.00',
        'whatsapp_number'  => $number,
    ]);
}

it('updates whatsapp_number on client', function () {
    $pm     = makeWhatsAppPm();
    $client = makeWhatsAppClient();

    $this->actingAs($pm)
        ->patch(route('pm.client.whatsapp.update', $client), [
            'whatsapp_number' => '+54 9 11 1234-5678',
        ])
        ->assertRedirect();

    expect($client->fresh()->whatsapp_number)->toBe('+54 9 11 1234-5678');
});

it('replaces existing whatsapp_number', function () {
    $pm     = makeWhatsAppPm();
    $client = makeWhatsAppClient('+54 9 11 0000-0000');

    $this->actingAs($pm)
        ->patch(route('pm.client.whatsapp.update', $client), [
            'whatsapp_number' => '+54 9 11 9999-9999',
        ]);

    expect($client->fresh()->whatsapp_number)->toBe('+54 9 11 9999-9999');
});

it('rejects empty whatsapp_number', function () {
    $pm     = makeWhatsAppPm();
    $client = makeWhatsAppClient();

    $this->actingAs($pm)
        ->patch(route('pm.client.whatsapp.update', $client), [
            'whatsapp_number' => '',
        ])
        ->assertSessionHasErrors('whatsapp_number');
});

it('rejects whatsapp_number longer than 30 chars', function () {
    $pm     = makeWhatsAppPm();
    $client = makeWhatsAppClient();

    $this->actingAs($pm)
        ->patch(route('pm.client.whatsapp.update', $client), [
            'whatsapp_number' => str_repeat('1', 31),
        ])
        ->assertSessionHasErrors('whatsapp_number');
});

it('requires authentication for whatsapp update', function () {
    $client = makeWhatsAppClient();

    $this->patch(route('pm.client.whatsapp.update', $client), [
        'whatsapp_number' => '+54 9 11 1234-5678',
    ])->assertRedirect(route('login'));
});
