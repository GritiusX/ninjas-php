<?php

use App\Models\Client;
use App\Models\ContentPiece;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\WhatsAppService;

beforeEach(function () {
    $this->mock(WhatsAppService::class, fn ($mock) => $mock->shouldIgnoreMissing());
    $this->mock(NotificationService::class, fn ($mock) => $mock->shouldIgnoreMissing());
});

function makeReviewPm(): User
{
    return User::factory()->create(['role' => 'admin', 'is_active' => true]);
}

function makeReviewClient(): Client
{
    return Client::create(['name' => 'Aura Natural', 'roas_goal' => '3.00']);
}

function makePieceInReview(Client $client): ContentPiece
{
    return ContentPiece::create([
        'client_id'          => $client->id,
        'concept'            => 'Test piece',
        'status'             => ContentPiece::STATUS_INTERNAL_REVIEW,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links' => ['https://drive.google.com/test'],
    ]);
}

// --- approve() ---

it('approve sets status to CLIENT_REVIEW and redirects to review page with flash', function () {
    $pm     = makeReviewPm();
    $client = makeReviewClient();
    $piece  = makePieceInReview($client);

    $response = $this->actingAs($pm)
        ->post(route('pm.review.approve', $piece));

    $piece->refresh();
    expect($piece->status)->toBe(ContentPiece::STATUS_CLIENT_REVIEW);
    expect($piece->review_token)->not->toBeNull();

    $response->assertRedirect(route('pm.review.show', $piece));
    $response->assertSessionHas('approved', true);
});

it('approve sets client_chosen_copy when provided', function () {
    $pm     = makeReviewPm();
    $client = makeReviewClient();
    $piece  = makePieceInReview($client);

    $this->actingAs($pm)
        ->post(route('pm.review.approve', $piece), ['selected_copy' => 'directo']);

    $piece->refresh();
    expect($piece->client_chosen_copy)->toBe('directo');
});

it('approve rejects invalid selected_copy value', function () {
    $pm     = makeReviewPm();
    $client = makeReviewClient();
    $piece  = makePieceInReview($client);

    $this->actingAs($pm)
        ->post(route('pm.review.approve', $piece), ['selected_copy' => 'invalido'])
        ->assertSessionHasErrors('selected_copy');
});

// --- requestChanges() ---

it('requestChanges sets status to REVISION with comments', function () {
    $pm     = makeReviewPm();
    $client = makeReviewClient();
    $piece  = makePieceInReview($client);

    $this->actingAs($pm)
        ->post(route('pm.review.request-changes', $piece), [
            'comments' => 'El audio no está bien.',
        ])
        ->assertRedirect(route('pm.dashboard'));

    $piece->refresh();
    expect($piece->status)->toBe(ContentPiece::STATUS_REVISION);
    expect($piece->internal_comments)->toBe('El audio no está bien.');
});

it('requestChanges requires comments', function () {
    $pm     = makeReviewPm();
    $client = makeReviewClient();
    $piece  = makePieceInReview($client);

    $this->actingAs($pm)
        ->post(route('pm.review.request-changes', $piece), ['comments' => ''])
        ->assertSessionHasErrors('comments');
});

// --- approveClientRevision() ---

it('approveClientRevision sets status to CLIENT_APPROVED', function () {
    $pm     = makeReviewPm();
    $client = makeReviewClient();
    $piece  = ContentPiece::create([
        'client_id'          => $client->id,
        'concept'            => 'Test piece',
        'status'             => ContentPiece::STATUS_CLIENT_REVIEW,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links' => ['https://drive.google.com/test'],
    ]);

    $this->actingAs($pm)
        ->post(route('pm.review.approve-client', $piece))
        ->assertRedirect(route('pm.dashboard'));

    $piece->refresh();
    expect($piece->status)->toBe(ContentPiece::STATUS_CLIENT_APPROVED);
});

// --- notifyEditor() ---

it('notifyEditor sets status to REVISION', function () {
    $pm     = makeReviewPm();
    $client = makeReviewClient();
    $piece  = ContentPiece::create([
        'client_id'          => $client->id,
        'concept'            => 'Test piece',
        'status'             => ContentPiece::STATUS_CLIENT_REVIEW,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links' => ['https://drive.google.com/test'],
    ]);

    $this->actingAs($pm)
        ->post(route('pm.review.notify-editor', $piece))
        ->assertRedirect(route('pm.dashboard'));

    $piece->refresh();
    expect($piece->status)->toBe(ContentPiece::STATUS_REVISION);
});

// --- auth guard ---

it('review approve requires authentication', function () {
    $client = makeReviewClient();
    $piece  = makePieceInReview($client);

    $this->post(route('pm.review.approve', $piece))
        ->assertRedirect(route('login'));
});
