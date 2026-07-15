<?php

use App\Models\AppNotification;
use App\Models\Client;
use App\Models\ContentPiece;
use App\Models\User;
use App\Services\NotificationService;

function makeNsClient(): Client
{
    return Client::create(['name' => 'NS Client', 'roas_goal' => '3.00']);
}

function makeNsPm(bool $active = true): User
{
    return User::factory()->create(['role' => 'pm', 'is_active' => $active]);
}

function makeNsEditor(bool $active = true): User
{
    return User::factory()->create(['role' => 'editor', 'is_active' => $active]);
}

function makeNsPiece(Client $client, ?User $editor = null): ContentPiece
{
    $piece = ContentPiece::create([
        'client_id'          => $client->id,
        'concept'            => 'Test concept',
        'status'             => ContentPiece::STATUS_INTERNAL_REVIEW,
        'priority'           => ContentPiece::PRIORITY_MEDIUM,
        'assigned_editor_id' => $editor?->id,
        'raw_material_links' => ['https://drive.google.com/test'],
    ]);
    $piece->load('client');
    return $piece;
}

// --- notifyPmVideoSubmitted ---

it('notifyPmVideoSubmitted creates one notification per active PM', function () {
    $pm1    = makeNsPm();
    $pm2    = makeNsPm();
    $client = makeNsClient();
    $editor = makeNsEditor();
    $piece  = makeNsPiece($client, $editor);

    (new NotificationService())->notifyPmVideoSubmitted($piece, $editor);

    expect(AppNotification::count())->toBe(2);
    expect(AppNotification::where('type', 'video.submitted')->count())->toBe(2);
    expect(AppNotification::where('user_id', $pm1->id)->exists())->toBeTrue();
    expect(AppNotification::where('user_id', $pm2->id)->exists())->toBeTrue();
});

it('notifyPmVideoSubmitted skips inactive PMs', function () {
    makeNsPm(active: true);
    makeNsPm(active: false);
    $client = makeNsClient();
    $editor = makeNsEditor();
    $piece  = makeNsPiece($client, $editor);

    (new NotificationService())->notifyPmVideoSubmitted($piece, $editor);

    expect(AppNotification::count())->toBe(1);
});

it('notifyPmVideoSubmitted notification link points to review page', function () {
    makeNsPm();
    $client = makeNsClient();
    $editor = makeNsEditor();
    $piece  = makeNsPiece($client, $editor);

    (new NotificationService())->notifyPmVideoSubmitted($piece, $editor);

    $notification = AppNotification::first();
    expect($notification->link)->toBe("/pm/review/{$piece->id}");
});

// --- notifyEditorChangesRequested ---

it('notifyEditorChangesRequested creates notification for assigned editor', function () {
    $editor = makeNsEditor();
    $client = makeNsClient();
    $piece  = makeNsPiece($client, $editor);
    $piece->internal_comments = 'Cambiar el audio';

    (new NotificationService())->notifyEditorChangesRequested($piece);

    expect(AppNotification::count())->toBe(1);
    expect(AppNotification::where('user_id', $editor->id)->where('type', 'changes.requested')->exists())->toBeTrue();
});

it('notifyEditorChangesRequested does nothing when no editor assigned', function () {
    $client = makeNsClient();
    $piece  = makeNsPiece($client, null);

    (new NotificationService())->notifyEditorChangesRequested($piece);

    expect(AppNotification::count())->toBe(0);
});

// --- notifyTaskPaused ---

it('notifyTaskPaused creates notification per active PM with reason in body', function () {
    $pm     = makeNsPm();
    $client = makeNsClient();
    $editor = makeNsEditor();
    $piece  = makeNsPiece($client, $editor);

    (new NotificationService())->notifyTaskPaused($piece, $editor, 'Falta material');

    $notification = AppNotification::where('user_id', $pm->id)->first();
    expect($notification)->not->toBeNull();
    expect($notification->type)->toBe('task.paused');
    expect($notification->body)->toContain('Falta material');
});

it('notifyTaskPaused skips inactive PMs', function () {
    makeNsPm(active: false);
    $client = makeNsClient();
    $editor = makeNsEditor();
    $piece  = makeNsPiece($client, $editor);

    (new NotificationService())->notifyTaskPaused($piece, $editor, 'Sin material');

    expect(AppNotification::count())->toBe(0);
});

// --- notifyEditorClientRevision ---

it('notifyEditorClientRevision creates notification for assigned editor', function () {
    $editor = makeNsEditor();
    $client = makeNsClient();
    $piece  = makeNsPiece($client, $editor);

    (new NotificationService())->notifyEditorClientRevision($piece);

    expect(AppNotification::count())->toBe(1);
    expect(AppNotification::where('user_id', $editor->id)->exists())->toBeTrue();
    expect(AppNotification::first()->link)->toBe("/editor/task/{$piece->id}");
});

it('notifyEditorClientRevision does nothing when no editor assigned', function () {
    $client = makeNsClient();
    $piece  = makeNsPiece($client, null);

    (new NotificationService())->notifyEditorClientRevision($piece);

    expect(AppNotification::count())->toBe(0);
});

// --- notifyPmClientRequestedChanges ---

it('notifyPmClientRequestedChanges notifies all active PMs and the assigned editor', function () {
    $pm     = makeNsPm();
    $editor = makeNsEditor();
    $client = makeNsClient();
    $piece  = makeNsPiece($client, $editor);

    (new NotificationService())->notifyPmClientRequestedChanges($piece, 'No me gustó el color');

    expect(AppNotification::where('user_id', $pm->id)->where('type', 'client.changes')->exists())->toBeTrue();
    expect(AppNotification::where('user_id', $editor->id)->where('type', 'changes.requested')->exists())->toBeTrue();
    expect(AppNotification::count())->toBe(2);
});

it('notifyPmClientRequestedChanges skips editor notification when none assigned', function () {
    $pm     = makeNsPm();
    $client = makeNsClient();
    $piece  = makeNsPiece($client, null);

    (new NotificationService())->notifyPmClientRequestedChanges($piece, 'Mensaje');

    expect(AppNotification::count())->toBe(1);
    expect(AppNotification::where('user_id', $pm->id)->exists())->toBeTrue();
});

it('notifyPmClientApproved notifies all active PMs', function () {
    $pm1    = makeNsPm();
    $pm2    = makeNsPm();
    $client = makeNsClient();
    $piece  = makeNsPiece($client);

    (new NotificationService())->notifyPmClientApproved($piece);

    expect(AppNotification::where('type', 'client.approved')->count())->toBe(2);
});
