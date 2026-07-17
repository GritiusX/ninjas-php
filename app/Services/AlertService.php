<?php

namespace App\Services;

use App\Models\AdMetric;
use App\Models\AlertConfig;
use App\Models\AppNotification;
use App\Models\ContentPiece;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AlertService
{
    // Minimum hours between repeated firings of the same alert
    private const COOLDOWN_HOURS = 20;

    public function __construct(private WhatsAppService $whatsapp)
    {
    }

    // ─── Content alerts ────────────────────────────────────────────────────────

    public function checkContentInactivity(): void
    {
        $configs = AlertConfig::where('alert_type', AlertConfig::TYPE_CONTENT_INACTIVITY)
            ->where('is_enabled', true)
            ->whereNotNull('client_id')
            ->with('client')
            ->get();

        foreach ($configs as $config) {
            if ($this->onCooldown($config)) {
                continue;
            }

            $days = (int) ($config->threshold_value ?? 3);

            $lastPublished = ContentPiece::where('client_id', $config->client_id)
                ->where('is_scheduled', true)
                ->where('deadline', '<=', now())
                ->max('deadline');

            if (!$lastPublished) {
                continue;
            }

            $daysSince = now()->diffInDays(Carbon::parse($lastPublished));

            if ($daysSince >= $days) {
                $this->notify(
                    config: $config,
                    type: 'alert.content_inactivity',
                    title: "[{$config->client->name}] Sin contenido publicado hace {$daysSince} días",
                    body: "El último contenido programado fue el " . Carbon::parse($lastPublished)->format('d/m/Y') . ".",
                    link: '/pm/dashboard',
                );
            }
        }
    }

    public function checkContentNoFuture(): void
    {
        $configs = AlertConfig::where('alert_type', AlertConfig::TYPE_CONTENT_NO_FUTURE)
            ->where('is_enabled', true)
            ->whereNotNull('client_id')
            ->with('client')
            ->get();

        foreach ($configs as $config) {
            if ($this->onCooldown($config)) {
                continue;
            }

            $hasFuture = ContentPiece::where('client_id', $config->client_id)
                ->where('is_scheduled', true)
                ->where('deadline', '>', now())
                ->exists();

            if (!$hasFuture) {
                $this->notify(
                    config: $config,
                    type: 'alert.content_no_future',
                    title: "[{$config->client->name}] Sin contenido futuro programado",
                    body: 'No quedan publicaciones futuras agendadas para este cliente.',
                    link: '/pm/dashboard',
                );
            }
        }
    }

    // ─── Editor workload ───────────────────────────────────────────────────────

    public function checkEditorOverload(): void
    {
        $config = AlertConfig::where('alert_type', AlertConfig::TYPE_EDITOR_OVERLOAD)
            ->whereNull('client_id')
            ->where('is_enabled', true)
            ->first();

        if (!$config) {
            return;
        }

        $threshold = (int) ($config->threshold_value ?? 6);
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        $editors = User::where('role', 'editor')->where('is_active', true)->get();

        foreach ($editors as $editor) {
            $todayCount = ContentPiece::where('assigned_editor_id', $editor->id)
                ->whereDate('deadline', $today)
                ->whereNotIn('status', [ContentPiece::STATUS_CLIENT_APPROVED, ContentPiece::STATUS_PUBLISHED])
                ->count();

            $overdueYesterday = ContentPiece::where('assigned_editor_id', $editor->id)
                ->whereDate('deadline', $yesterday)
                ->whereNotIn('status', [ContentPiece::STATUS_CLIENT_APPROVED, ContentPiece::STATUS_PUBLISHED])
                ->with('client')
                ->get(['id', 'concept', 'product', 'client_id']);

            if ($todayCount >= $threshold) {
                $overdueList = $overdueYesterday->map(
                    fn ($p) => "• [{$p->client->name}] " . ($p->concept ?? $p->product ?? "Pieza #{$p->id}")
                )->join("\n");

                $body = "Tiene {$todayCount} videos asignados para hoy (umbral: {$threshold}).";
                if ($overdueYesterday->count() > 0) {
                    $body .= "\n\nAtrasados de ayer:\n{$overdueList}";
                }

                $this->notify(
                    config: $config,
                    type: 'alert.editor_overload',
                    title: "Sobrecarga: {$editor->name} tiene {$todayCount} videos hoy",
                    body: $body,
                    link: '/pm/dashboard',
                );
            }
        }
    }

    // ─── Weekly follow-up ──────────────────────────────────────────────────────

    public function checkWeeklyMondayPending(): void
    {
        $config = AlertConfig::where('alert_type', AlertConfig::TYPE_WEEKLY_MONDAY_PENDING)
            ->whereNull('client_id')
            ->where('is_enabled', true)
            ->first();

        if (!$config) {
            return;
        }

        // Use Carbon objects (not date strings) so endOfWeek() includes the full last day
        $weekStart = now()->startOfWeek();
        $weekEnd   = now()->endOfWeek();

        $pending = ContentPiece::whereBetween('deadline', [$weekStart, $weekEnd])
            ->whereNotIn('status', [ContentPiece::STATUS_CLIENT_APPROVED, ContentPiece::STATUS_PUBLISHED])
            ->with('client', 'editor')
            ->orderBy('deadline')
            ->get();

        if ($pending->isEmpty()) {
            return;
        }

        $lines = $pending->map(function ($p) {
            $deadline = Carbon::parse($p->deadline)->format('d/M');
            $editor = $p->editor?->name ?? 'Sin editor';
            $label = $p->concept ?? $p->product ?? "Pieza #{$p->id}";
            return "• [{$p->client->name}] {$label} — {$editor} — {$deadline}";
        })->join("\n");

        $this->notify(
            config: $config,
            type: 'alert.weekly_monday',
            title: "Resumen semanal: {$pending->count()} videos pendientes esta semana",
            body: $lines,
            link: '/pm/dashboard',
        );
    }

    public function checkWeeklyThursdayMissing(): void
    {
        $config = AlertConfig::where('alert_type', AlertConfig::TYPE_WEEKLY_THURSDAY_MISSING)
            ->whereNull('client_id')
            ->where('is_enabled', true)
            ->first();

        if (!$config) {
            return;
        }

        $weekStart = now()->startOfWeek();
        $weekEnd   = now()->endOfWeek();

        $missing = ContentPiece::whereBetween('deadline', [$weekStart, $weekEnd])
            ->whereIn('status', [
                ContentPiece::STATUS_BRIEF,
                ContentPiece::STATUS_EDITING,
                ContentPiece::STATUS_REVISION,
            ])
            ->with('client', 'editor')
            ->orderBy('deadline')
            ->get();

        if ($missing->isEmpty()) {
            return;
        }

        $lines = $missing->map(function ($p) {
            $deadline = Carbon::parse($p->deadline)->format('d/M');
            $editor = $p->editor?->name ?? 'Sin editor';
            $label = $p->concept ?? $p->product ?? "Pieza #{$p->id}";
            return "• [{$p->client->name}] {$label} — {$editor} — {$p->status} — vence {$deadline}";
        })->join("\n");

        $this->notify(
            config: $config,
            type: 'alert.weekly_thursday',
            title: "Jueves: {$missing->count()} videos en riesgo esta semana",
            body: $lines,
            link: '/pm/dashboard',
        );
    }

    // ─── Production summary ────────────────────────────────────────────────────

    public function checkProductionSummaryMonday(): void
    {
        $config = AlertConfig::where('alert_type', AlertConfig::TYPE_PRODUCTION_SUMMARY)
            ->whereNull('client_id')
            ->where('is_enabled', true)
            ->first();

        if (!$config) {
            return;
        }

        $lastWeekStart = now()->subWeek()->startOfWeek();
        $lastWeekEnd   = now()->subWeek()->endOfWeek();

        $edited = ContentPiece::where('status', ContentPiece::STATUS_CLIENT_APPROVED)
            ->whereBetween('updated_at', [$lastWeekStart, $lastWeekEnd])
            ->count();

        if ($edited === 0) {
            return;
        }

        $this->notify(
            config: $config,
            type: 'alert.production_summary',
            title: "Resumen semana anterior: {$edited} videos completados",
            body: "Del " . $lastWeekStart->format('d/m') . " al " . $lastWeekEnd->format('d/m') . " se completaron {$edited} videos.",
            link: '/pm/dashboard',
        );
    }

    // ─── Ads alerts ────────────────────────────────────────────────────────────

    public function checkCampaignNoSpend(): void
    {
        $configs = AlertConfig::where('alert_type', AlertConfig::TYPE_CAMPAIGN_NO_SPEND)
            ->where('is_enabled', true)
            ->whereNotNull('client_id')
            ->with('client')
            ->get();

        foreach ($configs as $config) {
            if ($this->onCooldown($config)) {
                continue;
            }

            $days = (int) ($config->threshold_value ?? 3);

            // Only check clients that have had historical ad spend (avoid false positives for non-ad clients)
            $hasHistoricalSpend = AdMetric::where('client_id', $config->client_id)
                ->where('investment', '>', 0)
                ->exists();

            if (!$hasHistoricalSpend) {
                continue;
            }

            $since = now()->subDays($days)->toDateString();
            $hasRecentSpend = AdMetric::where('client_id', $config->client_id)
                ->where('date', '>=', $since)
                ->where('investment', '>', 0)
                ->exists();

            if (!$hasRecentSpend) {
                $this->notify(
                    config: $config,
                    type: 'alert.campaign_no_spend',
                    title: "[{$config->client->name}] Sin inversión publicitaria hace {$days} días",
                    body: "No se registró inversión en los últimos {$days} días. Verificá el estado de las campañas.",
                    link: '/metrics/' . $config->client_id,
                );
            }
        }
    }

    public function checkRoasBelow(): void
    {
        $configs = AlertConfig::where('alert_type', AlertConfig::TYPE_ROAS_BELOW)
            ->where('is_enabled', true)
            ->whereNotNull('client_id')
            ->with('client')
            ->get();

        foreach ($configs as $config) {
            if ($this->onCooldown($config)) {
                continue;
            }

            $threshold = $config->threshold_value ?? $config->client->roas_goal ?? null;

            if (!$threshold) {
                continue;
            }

            $since = now()->subDays(5)->toDateString();

            $metrics = AdMetric::where('client_id', $config->client_id)
                ->where('date', '>=', $since)
                ->where('investment', '>', 0)
                ->get();

            if ($metrics->isEmpty()) {
                continue;
            }

            $totalInvestment = $metrics->sum('investment');
            $totalRevenue    = $metrics->sum('revenue');
            $avgRoas = $totalInvestment > 0 ? round($totalRevenue / $totalInvestment, 2) : 0;

            if ($avgRoas < $threshold) {
                $this->notify(
                    config: $config,
                    type: 'alert.roas_below',
                    title: "[{$config->client->name}] ROAS bajo: {$avgRoas} (objetivo: {$threshold})",
                    body: "ROAS promedio de los últimos 5 días: {$avgRoas}. Objetivo del cliente: {$threshold}.",
                    link: '/metrics/' . $config->client_id,
                );
            }
        }
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    private function onCooldown(AlertConfig $config): bool
    {
        if (!$config->last_alerted_at) {
            return false;
        }

        return $config->last_alerted_at->diffInHours(now()) < self::COOLDOWN_HOURS;
    }

    private function notify(AlertConfig $config, string $type, string $title, string $body, string $link): void
    {
        $recipients = $this->recipients($config);

        if ($recipients->isEmpty()) {
            return;
        }

        foreach ($recipients as $user) {
            AppNotification::create([
                'user_id'    => $user->id,
                'type'       => $type,
                'title'      => $title,
                'body'       => $body,
                'link'       => $link,
                'created_at' => now(),
            ]);

            if ($user->whatsapp_number) {
                $message = "*{$title}*\n{$body}";
                try {
                    $this->whatsapp->sendPmNotification($user->whatsapp_number, $message);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('AlertService: WhatsApp send failed', [
                        'user_id' => $user->id,
                        'error'   => $e->getMessage(),
                    ]);
                }
            }
        }

        $config->update(['last_alerted_at' => now()]);
    }

    private function recipients(AlertConfig $config): Collection
    {
        $roles = [];
        if ($config->notify_admin) {
            $roles[] = 'admin';
        }
        if ($config->notify_pm) {
            $roles[] = 'pm';
        }

        if (empty($roles)) {
            return collect();
        }

        return User::whereIn('role', $roles)->where('is_active', true)->get();
    }
}
