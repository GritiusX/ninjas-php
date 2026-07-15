<?php

use App\Models\Client;
use App\Models\ContentPiece;
use App\Models\User;
use App\Services\NotificationService;

beforeEach(function () {
    $this->mock(NotificationService::class, fn ($mock) => $mock->shouldIgnoreMissing());
});

function makeCrClient(): Client
{
    return Client::create(['name' => 'Review Client', 'roas_goal' => '3.00']);
}

function makeCrPiece(Client $client, string $status = ContentPiece::STATUS_CLIENT_REVIEW, ?string $token = null): ContentPiece
{
    return ContentPiece::create([
        'client_id'          => $client->id,
        'concept'            => 'Un video de prueba',
        'status'             => $status,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links' => ['https://drive.google.com/test'],
        'review_token'       => $token ?? \Illuminate\Support\Str::uuid()->toString(),
    ]);
}

// --- show ---

it('returns 404 for invalid token', function () {
    $this->get('/review/invalid-token-xyz')
        ->assertNotFound();
});

it('show renders client-review page for valid token', function () {
    $client = makeCrClient();
    $piece  = makeCrPiece($client);

    $this->withoutVite()
        ->get("/review/{$piece->review_token}")
        ->assertOk();
});

it('show does not 404 when piece status is CLIENT_APPROVED', function () {
    $client = makeCrClient();
    $piece  = makeCrPiece($client, ContentPiece::STATUS_CLIENT_APPROVED);

    // The already_responded flag is passed as an Inertia prop; we verify the
    // page loads (not 404) and that a second respond() attempt is blocked.
    $this->withoutVite()
        ->get("/review/{$piece->review_token}")
        ->assertOk();
});

// --- respond ---

it('respond approve sets status to CLIENT_APPROVED', function () {
    $client = makeCrClient();
    $piece  = makeCrPiece($client);

    $this->withoutVite()
        ->post("/review/{$piece->review_token}/respond", [
            'decision' => 'approve',
        ]);

    $piece->refresh();
    expect($piece->status)->toBe(ContentPiece::STATUS_CLIENT_APPROVED);
});

it('respond approve stores client_feedback', function () {
    $client = makeCrClient();
    $piece  = makeCrPiece($client);

    $this->withoutVite()
        ->post("/review/{$piece->review_token}/respond", [
            'decision' => 'approve',
            'comment'  => '¡Me encantó!',
        ]);

    $piece->refresh();
    expect($piece->client_feedback)->toBe('¡Me encantó!');
});

it('respond reject sets status to CLIENT_REVISION', function () {
    $client = makeCrClient();
    $piece  = makeCrPiece($client);

    $this->withoutVite()
        ->post("/review/{$piece->review_token}/respond", [
            'decision' => 'reject',
            'comment'  => 'El color no es correcto.',
        ]);

    $piece->refresh();
    expect($piece->status)->toBe(ContentPiece::STATUS_CLIENT_REVISION);
});

it('respond reject requires a comment', function () {
    $client = makeCrClient();
    $piece  = makeCrPiece($client);

    $this->withoutVite()
        ->post("/review/{$piece->review_token}/respond", [
            'decision' => 'reject',
            'comment'  => '',
        ])
        ->assertSessionHasErrors('comment');
});

it('respond with invalid decision is rejected', function () {
    $client = makeCrClient();
    $piece  = makeCrPiece($client);

    $this->withoutVite()
        ->post("/review/{$piece->review_token}/respond", [
            'decision' => 'maybe',
        ])
        ->assertSessionHasErrors('decision');
});

it('respond does not change status when piece was already responded', function () {
    $client = makeCrClient();
    $piece  = makeCrPiece($client, ContentPiece::STATUS_CLIENT_APPROVED);

    $this->withoutVite()
        ->post("/review/{$piece->review_token}/respond", [
            'decision' => 'reject',
            'comment'  => 'Too late',
        ]);

    $piece->refresh();
    expect($piece->status)->toBe(ContentPiece::STATUS_CLIENT_APPROVED);
});

it('respond returns 404 for invalid token', function () {
    $this->withoutVite()
        ->post('/review/invalid-token/respond', ['decision' => 'approve'])
        ->assertNotFound();
});
