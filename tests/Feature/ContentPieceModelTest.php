<?php

use App\Models\Client;
use App\Models\ContentPiece;

function makePiece(array $attrs = []): ContentPiece
{
    $client = Client::create(['name' => 'Test', 'roas_goal' => '3.00']);

    return ContentPiece::create(array_merge([
        'client_id'          => $client->id,
        'concept'            => 'Test piece',
        'status'             => ContentPiece::STATUS_BRIEF,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'raw_material_links' => ['https://drive.google.com/test'],
    ], $attrs));
}

// --- isPaused() ---

it('isPaused returns false when paused_until is null', function () {
    $piece = makePiece(['paused_until' => null]);
    expect($piece->isPaused())->toBeFalse();
});

it('isPaused returns false when paused_until is in the past', function () {
    $piece = makePiece(['paused_until' => now()->subHour()]);
    expect($piece->isPaused())->toBeFalse();
});

it('isPaused returns true when paused_until is in the future', function () {
    $piece = makePiece(['paused_until' => now()->addHours(4)]);
    expect($piece->isPaused())->toBeTrue();
});

// --- isOverdue() ---

it('isOverdue returns false when deadline is null', function () {
    $piece = makePiece(['deadline' => null]);
    expect($piece->isOverdue())->toBeFalse();
});

it('isOverdue returns false when deadline is in the future', function () {
    $piece = makePiece(['deadline' => now()->addDay()]);
    expect($piece->isOverdue())->toBeFalse();
});

it('isOverdue returns true when deadline is in the past', function () {
    $piece = makePiece(['deadline' => now()->subDay()]);
    expect($piece->isOverdue())->toBeTrue();
});

// --- getPriorityLabel() ---

it('getPriorityLabel returns correct label for each priority', function () {
    expect(makePiece(['priority' => ContentPiece::PRIORITY_CRITICAL])->getPriorityLabel())->toBe('Crítico');
    expect(makePiece(['priority' => ContentPiece::PRIORITY_HIGH])->getPriorityLabel())->toBe('Alto');
    expect(makePiece(['priority' => ContentPiece::PRIORITY_MEDIUM])->getPriorityLabel())->toBe('Medio');
});

it('getPriorityLabel falls back to Medio for unknown priority', function () {
    $piece = makePiece();
    $piece->priority = 99;
    expect($piece->getPriorityLabel())->toBe('Medio');
});
