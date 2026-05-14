<?php

use App\Http\Controllers\Admin\AccessController;
use App\Http\Controllers\Admin\AuditController;
use App\Http\Controllers\Admin\ClientAdminController;
use App\Http\Controllers\Admin\UserAdminController;
use App\Http\Controllers\AdsController;
use App\Http\Controllers\Editor\EditorController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PM\BriefController;
use App\Http\Controllers\PM\PmController;
use App\Http\Controllers\PM\ReviewController;
use App\Http\Controllers\Webhook\WhatsAppWebhookController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware('auth')->get('/dashboard', function () {
    return match (auth()->user()->role) {
        'admin' => redirect()->route('admin.users.index'),
        'pm' => redirect()->route('pm.dashboard'),
        'editor' => redirect()->route('editor.dashboard'),
        default => redirect()->route('home'),
    };
})->name('dashboard');

// --- Editor ---
Route::middleware(['auth', 'role:editor'])->prefix('editor')->name('editor.')->group(function () {
    Route::get('/', [EditorController::class, 'dashboard'])->name('dashboard');
    Route::get('/task/{piece}', [EditorController::class, 'task'])->name('task');
    Route::post('/submit-video/{piece}', [EditorController::class, 'submitVideo'])->name('submit-video');
});

// --- PM / Admin ---
Route::middleware(['auth', 'role:pm'])->prefix('pm')->name('pm.')->group(function () {
    Route::get('/', [PmController::class, 'dashboard'])->name('dashboard');

    // Briefs
    Route::post('/brief', [BriefController::class, 'store'])->name('brief.store');
    Route::put('/brief/{piece}', [BriefController::class, 'update'])->name('brief.update');
    Route::delete('/brief/{piece}', [BriefController::class, 'destroy'])->name('brief.destroy');
    Route::post('/brief/{piece}/assign', [BriefController::class, 'assign'])->name('brief.assign');

    // Review room
    Route::get('/review/{piece}', [ReviewController::class, 'show'])->name('review.show');
    Route::post('/review/{piece}/generate-copy', [ReviewController::class, 'generateCopy'])->name('review.generate-copy');
    Route::post('/review/{piece}/approve', [ReviewController::class, 'approve'])->name('review.approve');
    Route::post('/review/{piece}/request-changes', [ReviewController::class, 'requestChanges'])->name('review.request-changes');
    Route::post('/review/{piece}/approve-client', [ReviewController::class, 'approveClientRevision'])->name('review.approve-client');
});

// --- Panel de Métricas (PM + Admin) ---
Route::middleware(['auth', 'role:pm'])->get('/metrics', [AdsController::class, 'index'])->name('metrics.index');

// --- Notificaciones (todos los roles) ---
Route::middleware('auth')->prefix('notifications')->name('notifications.')->group(function () {
    Route::get('/', [NotificationController::class, 'index'])->name('index');
    Route::post('/{notification}/read', [NotificationController::class, 'markRead'])->name('read');
    Route::post('/read-all', [NotificationController::class, 'markAllRead'])->name('read-all');
});

// --- Admin ---
Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::resource('users', UserAdminController::class)->except(['show']);
    Route::resource('clients', ClientAdminController::class)->except(['show']);
    Route::get('/matrix', [AccessController::class, 'matrix'])->name('matrix');
    Route::post('/access', [AccessController::class, 'grant'])->name('access.grant');
    Route::delete('/access/{access}', [AccessController::class, 'revoke'])->name('access.revoke');
    Route::get('/audit', [AuditController::class, 'index'])->name('audit');
});

// --- Webhook WhatsApp (público) ---
Route::get('/webhook/whatsapp', [WhatsAppWebhookController::class, 'verify'])->name('webhook.whatsapp.verify');
Route::post('/webhook/whatsapp', [WhatsAppWebhookController::class, 'receive'])->name('webhook.whatsapp.receive');

require __DIR__.'/settings.php';
