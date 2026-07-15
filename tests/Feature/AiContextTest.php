<?php

use App\Models\AiGlobalContext;
use App\Models\Client;
use App\Models\ContentPiece;
use App\Models\User;
use App\Services\GeminiService;

function makeAiAdmin(): User
{
    return User::factory()->create(['role' => 'admin', 'is_active' => true]);
}

function makeAiClient(?string $aiContext = null): Client
{
    return Client::create([
        'name'       => 'AI Test Client',
        'roas_goal'  => '3.00',
        'ai_context' => $aiContext,
    ]);
}

// --- AiGlobalContext model ---

it('AiGlobalContext::get returns empty string when no record exists', function () {
    expect(AiGlobalContext::get())->toBe('');
});

it('AiGlobalContext::set creates a new record', function () {
    AiGlobalContext::set('Somos una agencia ninja.');

    expect(AiGlobalContext::count())->toBe(1);
    expect(AiGlobalContext::get())->toBe('Somos una agencia ninja.');
});

it('AiGlobalContext::set updates existing record instead of creating another', function () {
    AiGlobalContext::set('Primera versión.');
    AiGlobalContext::set('Segunda versión.');

    expect(AiGlobalContext::count())->toBe(1);
    expect(AiGlobalContext::get())->toBe('Segunda versión.');
});

// --- AiContextController: updateGlobal ---

it('admin can update global AI context', function () {
    $admin = makeAiAdmin();

    $this->actingAs($admin)
        ->post(route('admin.ai-context.global'), [
            'context' => 'Contexto global de la agencia.',
        ])
        ->assertRedirect();

    expect(AiGlobalContext::get())->toBe('Contexto global de la agencia.');
});

it('updateGlobal requires context field', function () {
    $admin = makeAiAdmin();

    $this->actingAs($admin)
        ->post(route('admin.ai-context.global'), ['context' => ''])
        ->assertSessionHasErrors('context');
});

it('updateGlobal rejects context over 10000 chars', function () {
    $admin = makeAiAdmin();

    $this->actingAs($admin)
        ->post(route('admin.ai-context.global'), [
            'context' => str_repeat('a', 10001),
        ])
        ->assertSessionHasErrors('context');
});

// --- AiContextController: updateClient ---

it('admin can update client AI context', function () {
    $admin  = makeAiAdmin();
    $client = makeAiClient();

    $this->actingAs($admin)
        ->patch(route('admin.ai-context.client', $client), [
            'ai_context' => 'Contexto específico del cliente.',
        ])
        ->assertRedirect();

    expect($client->fresh()->ai_context)->toBe('Contexto específico del cliente.');
});

it('updateClient clears ai_context when empty string sent', function () {
    $admin  = makeAiAdmin();
    $client = makeAiClient('Contexto previo.');

    $this->actingAs($admin)
        ->patch(route('admin.ai-context.client', $client), [
            'ai_context' => '',
        ]);

    expect($client->fresh()->ai_context)->toBeNull();
});

it('updateClient requires admin role', function () {
    $pm = User::factory()->create(['role' => 'pm', 'is_active' => true]);
    $client = makeAiClient();

    $this->actingAs($pm)
        ->patch(route('admin.ai-context.client', $client), [
            'ai_context' => 'Algo',
        ])
        ->assertRedirect(route('dashboard'));
});

// --- GeminiService getBrandContext concatenation ---

it('getBrandContext returns only global context when client has none', function () {
    AiGlobalContext::set('Contexto global.');
    $client = makeAiClient(null);
    $piece  = ContentPiece::create([
        'client_id'          => $client->id,
        'concept'            => 'Test',
        'status'             => ContentPiece::STATUS_BRIEF,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links' => ['https://drive.google.com/test'],
    ]);
    $piece->load('client');

    $service = new GeminiService();
    $method  = (new ReflectionMethod(GeminiService::class, 'getBrandContext'));
    $method->setAccessible(true);
    $result = $method->invoke($service, $piece);

    expect($result)->toBe('Contexto global.');
});

it('getBrandContext concatenates global and client context with separator', function () {
    AiGlobalContext::set('Contexto global.');
    $client = makeAiClient('Contexto del cliente.');
    $piece  = ContentPiece::create([
        'client_id'          => $client->id,
        'concept'            => 'Test',
        'status'             => ContentPiece::STATUS_BRIEF,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links' => ['https://drive.google.com/test'],
    ]);
    $piece->load('client');

    $service = new GeminiService();
    $method  = (new ReflectionMethod(GeminiService::class, 'getBrandContext'));
    $method->setAccessible(true);
    $result = $method->invoke($service, $piece);

    expect($result)->toBe("Contexto global.\n\n---\n\nContexto del cliente.");
});

it('getBrandContext returns only client context when no global context', function () {
    $client = makeAiClient('Solo cliente.');
    $piece  = ContentPiece::create([
        'client_id'          => $client->id,
        'concept'            => 'Test',
        'status'             => ContentPiece::STATUS_BRIEF,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links' => ['https://drive.google.com/test'],
    ]);
    $piece->load('client');

    $service = new GeminiService();
    $method  = (new ReflectionMethod(GeminiService::class, 'getBrandContext'));
    $method->setAccessible(true);
    $result = $method->invoke($service, $piece);

    expect($result)->toBe('Solo cliente.');
});

it('getBrandContext falls back to client name when both contexts are empty', function () {
    $client = makeAiClient(null);
    $piece  = ContentPiece::create([
        'client_id'          => $client->id,
        'concept'            => 'Test',
        'status'             => ContentPiece::STATUS_BRIEF,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links' => ['https://drive.google.com/test'],
    ]);
    $piece->load('client');

    $service = new GeminiService();
    $method  = (new ReflectionMethod(GeminiService::class, 'getBrandContext'));
    $method->setAccessible(true);
    $result = $method->invoke($service, $piece);

    expect($result)->toBe('Cliente: AI Test Client');
});
