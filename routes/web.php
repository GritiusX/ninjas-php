<?php

use App\Http\Controllers\Admin\AccessController;
use App\Http\Controllers\Admin\AiContextController;
use App\Http\Controllers\Admin\AlertConfigController;
use App\Http\Controllers\Admin\AuditController;
use App\Http\Controllers\Admin\ClientAdminController;
use App\Http\Controllers\Admin\ErrorLogController;
use App\Http\Controllers\Admin\GoogleAdsAuthController;
use App\Http\Controllers\Admin\UserAdminController;
use App\Http\Controllers\MetricsController;
use App\Http\Controllers\MetricsPdfController;
use App\Http\Controllers\Editor\EditorController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PM\BriefController;
use App\Http\Controllers\PM\BriefPdfController;
use App\Http\Controllers\PM\PmController;
use App\Http\Controllers\PM\MetricoolScheduleController;
use App\Http\Controllers\PM\ReviewController;
use App\Http\Controllers\PM\VideoStreamController;
use App\Http\Controllers\ClientReviewController;
use App\Http\Controllers\PublicMediaController;
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
    Route::get('/task/{piece}/pdf', [BriefPdfController::class, 'download'])->name('task.pdf');
    Route::post('/task/{piece}/pause', [EditorController::class, 'pause'])->name('task.pause');
    Route::post('/submit-video/{piece}', [EditorController::class, 'submitVideo'])->name('submit-video');
});

// --- PM / Admin ---
Route::middleware(['auth', 'role:pm'])->prefix('pm')->name('pm.')->group(function () {
    Route::get('/', [PmController::class, 'dashboard'])->name('dashboard');
    Route::get('/tabla', [PmController::class, 'tabla'])->name('tabla');

    // Briefs
    Route::post('/brief', [BriefController::class, 'store'])->name('brief.store');
    Route::post('/brief/bulk', [BriefController::class, 'bulkStore'])->name('brief.bulk-store');
    Route::put('/brief/{piece}', [BriefController::class, 'update'])->name('brief.update');
    Route::delete('/brief/{piece}', [BriefController::class, 'destroy'])->name('brief.destroy');
    Route::post('/brief/{piece}/assign', [BriefController::class, 'assign'])->name('brief.assign');
    Route::get('/brief/{piece}/pdf', [BriefPdfController::class, 'download'])->name('brief.pdf');
    Route::get('/client/{client}/brief-pdf', [BriefPdfController::class, 'downloadClient'])->name('client.brief-pdf');

    // Review room
    Route::get('/review', [ReviewController::class, 'index'])->name('review.index');
    Route::get('/review/{piece}', [ReviewController::class, 'show'])->name('review.show');
    Route::post('/review/{piece}/generate-copy', [ReviewController::class, 'generateCopy'])->name('review.generate-copy');
    Route::patch('/review/{piece}/copy', [ReviewController::class, 'updateCopy'])->name('review.update-copy');
    Route::post('/review/{piece}/approve', [ReviewController::class, 'approve'])->name('review.approve');
    Route::post('/review/{piece}/request-changes', [ReviewController::class, 'requestChanges'])->name('review.request-changes');
    Route::post('/review/{piece}/approve-client', [ReviewController::class, 'approveClientRevision'])->name('review.approve-client');
    Route::post('/review/{piece}/notify-editor', [ReviewController::class, 'notifyEditor'])->name('review.notify-editor');
    Route::get('/review/{piece}/stream-video', [VideoStreamController::class, 'stream'])->name('review.stream-video');
    Route::patch('/client/{client}/whatsapp', [\App\Http\Controllers\PM\ClientWhatsAppController::class, 'update'])->name('client.whatsapp.update');

    // Metricool scheduling
    Route::get('/pieces/{piece}/metricool-networks', [MetricoolScheduleController::class, 'networks'])->name('pieces.metricool-networks');
    Route::post('/pieces/{piece}/schedule-metricool', [MetricoolScheduleController::class, 'schedule'])->name('pieces.schedule-metricool');
});

// --- Panel de Métricas (PM + Admin) ---
Route::middleware(['auth', 'role:pm'])->prefix('metrics')->name('metrics.')->group(function () {
    Route::get('/', [MetricsController::class, 'index'])->name('index');
    Route::post('/{client}/sync-one', [MetricsController::class, 'syncOne'])->name('sync-one');
    Route::post('/reports-generate', [MetricsController::class, 'metricoolReportsGenerate'])->name('reportsGenerate');
    Route::get('/reports-status', [MetricsController::class, 'metricoolReportsStatus'])->name('reportsStatus');
    Route::get('/reports-zip', [MetricsController::class, 'metricoolReportsZipAll'])->name('reportsZip');
    Route::get('/reports-diagnose', [MetricsController::class, 'metricoolReportsDiagnose'])->name('reportsDiagnose');
    Route::get('/{client}', [MetricsController::class, 'show'])->name('show');
    Route::get('/{client}/pdf', [MetricsPdfController::class, 'download'])->name('pdf');
    Route::get('/{client}/metricool-reports', [MetricsController::class, 'metricoolReports'])->name('metricoolReports');
    Route::post('/{client}/metricool-report-create', [MetricsController::class, 'metricoolReportCreate'])->name('metricoolReportCreate');
    Route::get('/{client}/metricool-report-download', [MetricsController::class, 'metricoolReportDownload'])->name('metricoolReportDownload');
    Route::post('/{client}/sync', [MetricsController::class, 'sync'])->name('sync');
});

// --- Notificaciones (todos los roles) ---
Route::middleware('auth')->prefix('notifications')->name('notifications.')->group(function () {
    Route::get('/', [NotificationController::class, 'index'])->name('index');
    Route::post('/{notification}/read', [NotificationController::class, 'markRead'])->name('read');
    Route::post('/read-all', [NotificationController::class, 'markAllRead'])->name('read-all');
});

// --- Google Ads OAuth (solo admin) ---
Route::middleware(['auth', 'role:admin'])->prefix('google-ads')->name('google-ads.')->group(function () {
    Route::get('/connect', [GoogleAdsAuthController::class, 'redirect'])->name('connect');
    Route::get('/callback', [GoogleAdsAuthController::class, 'callback'])->name('callback');
    Route::get('/accounts', [GoogleAdsAuthController::class, 'accounts'])->name('accounts');
    Route::get('/accounts/data', [GoogleAdsAuthController::class, 'accountsData'])->name('accounts.data');
    Route::post('/accounts/map', [GoogleAdsAuthController::class, 'mapAccounts'])->name('accounts.map');
});

// --- Admin ---
Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::resource('users', UserAdminController::class)->except(['show']);
    Route::resource('clients', ClientAdminController::class)->except(['show']);
    Route::get('/matrix', [AccessController::class, 'matrix'])->name('matrix');
    Route::post('/access', [AccessController::class, 'grant'])->name('access.grant');
    Route::delete('/access/{access}', [AccessController::class, 'revoke'])->name('access.revoke');
    Route::get('/audit', [AuditController::class, 'index'])->name('audit');
    Route::get('/alerts', [AlertConfigController::class, 'index'])->name('alerts.index');
    Route::put('/alerts/{alertConfig}', [AlertConfigController::class, 'update'])->name('alerts.update');
    Route::get('/ai-context', [AiContextController::class, 'index'])->name('ai-context.index');
    Route::get('/error-logs', [ErrorLogController::class, 'index'])->name('error-logs.index');
    Route::post('/ai-context/global', [AiContextController::class, 'updateGlobal'])->name('ai-context.global');
    Route::patch('/ai-context/client/{client}', [AiContextController::class, 'updateClient'])->name('ai-context.client');
});

// --- Revisión pública del cliente (sin auth) ---
Route::get('/review/{token}', [ClientReviewController::class, 'show'])->name('client-review.show');
Route::post('/review/{token}/respond', [ClientReviewController::class, 'respond'])->name('client-review.respond');

// --- Media pública (sin auth, gateada por review_token) ---
Route::get('/media/{token}/video', [PublicMediaController::class, 'video'])
    ->middleware('throttle:30,1')
    ->name('media.video');

// --- Webhook WhatsApp (público) ---
Route::get('/webhook/whatsapp', [WhatsAppWebhookController::class, 'verify'])->name('webhook.whatsapp.verify');
Route::post('/webhook/whatsapp', [WhatsAppWebhookController::class, 'receive'])->name('webhook.whatsapp.receive');

require __DIR__.'/settings.php';
