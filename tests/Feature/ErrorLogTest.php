<?php

use App\Http\Controllers\Admin\ErrorLogController;
use App\Models\User;
use Illuminate\Support\Facades\File;

// --- Unit-style tests for the private parser ---

function invokeParseLatestLogs(int $limit = 100): array
{
    $controller = new ErrorLogController();
    $method     = new ReflectionMethod(ErrorLogController::class, 'parseLatestLogs');
    $method->setAccessible(true);
    return $method->invoke($controller, $limit);
}

it('returns empty array when no log files exist', function () {
    // Ensure no error log files are present during testing
    $logDir = storage_path('logs');
    foreach (glob($logDir . '/errors-*.log') as $f) {
        File::delete($f);
    }

    expect(invokeParseLatestLogs())->toBe([]);
});

it('parses a well-formed log entry', function () {
    $logFile = storage_path('logs/errors-2026-07-13.log');
    $context = json_encode([
        'exception' => 'App\\Exceptions\\SomeException',
        'file'      => '/app/Http/Controllers/Foo.php:42',
        'url'       => 'https://app.test/pm/dashboard',
        'method'    => 'GET',
        'user'      => 'gonzalo@littleninjas.com',
        'trace'     => "#0 Foo.php(42)\n#1 Bar.php(10)",
    ]);
    $line = "[2026-07-13 10:00:00] production.ERROR: Something went wrong {$context}\n";

    File::put($logFile, $line);

    $entries = invokeParseLatestLogs();

    expect($entries)->toHaveCount(1);
    expect($entries[0]['message'])->toBe('Something went wrong');
    expect($entries[0]['exception'])->toBe('App\\Exceptions\\SomeException');
    expect($entries[0]['method'])->toBe('GET');
    expect($entries[0]['user'])->toBe('gonzalo@littleninjas.com');
    expect($entries[0]['timestamp'])->toBe('2026-07-13 10:00:00');

    File::delete($logFile);
});

it('parses multiple entries from a single file in reverse order', function () {
    $logFile = storage_path('logs/errors-2026-07-13.log');
    $lines   = implode('', [
        "[2026-07-13 09:00:00] production.ERROR: First error {}\n",
        "[2026-07-13 10:00:00] production.ERROR: Second error {}\n",
    ]);

    File::put($logFile, $lines);

    $entries = invokeParseLatestLogs();

    // Most recent first
    expect($entries[0]['message'])->toBe('Second error');
    expect($entries[1]['message'])->toBe('First error');

    File::delete($logFile);
});

it('respects the limit parameter', function () {
    $logFile = storage_path('logs/errors-2026-07-13.log');
    $lines   = '';
    for ($i = 1; $i <= 10; $i++) {
        $lines .= "[2026-07-13 0{$i}:00:00] production.ERROR: Error {$i} {}\n";
    }

    File::put($logFile, $lines);

    $entries = invokeParseLatestLogs(3);

    expect($entries)->toHaveCount(3);

    File::delete($logFile);
});

it('handles entries without JSON context gracefully', function () {
    $logFile = storage_path('logs/errors-2026-07-13.log');
    File::put($logFile, "[2026-07-13 12:00:00] production.ERROR: Plain message without context\n");

    $entries = invokeParseLatestLogs();

    expect($entries)->toHaveCount(1);
    expect($entries[0]['message'])->toBe('Plain message without context');
    expect($entries[0]['exception'])->toBeNull();
    expect($entries[0]['url'])->toBeNull();

    File::delete($logFile);
});

// --- HTTP endpoint ---

it('error-logs index is accessible by admin', function () {
    $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);

    $this->withoutVite()
        ->actingAs($admin)
        ->get('/admin/error-logs')
        ->assertOk();
});

it('error-logs index is not accessible by pm role', function () {
    $pm = User::factory()->create(['role' => 'pm', 'is_active' => true]);

    $this->actingAs($pm)
        ->get('/admin/error-logs')
        ->assertRedirect(route('dashboard'));
});

it('error-logs index redirects guests to login', function () {
    $this->get('/admin/error-logs')
        ->assertRedirect(route('login'));
});
