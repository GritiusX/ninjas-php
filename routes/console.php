<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Snapshot diario de Metrics (Evolución, vía Selenium) para historial de
// sparklines/drill-down.
Schedule::command('metricool:snapshot-history')
    ->dailyAt('02:00')
    ->withoutOverlapping()
    ->onOneServer();

// Descarga mensual de reportes Metricool el día 1 de cada mes a las 2am GMT-3 (05:00 UTC)
Schedule::command('metricool:monthly-reports')
    ->monthlyOn(1, '05:00')
    ->withoutOverlapping()
    ->onOneServer();

// Alertas diarias (08:00 AM)
Schedule::command('alerts:run --type=editor_overload')->dailyAt('08:00')->withoutOverlapping();
Schedule::command('alerts:run --type=content_inactivity')->dailyAt('09:00')->withoutOverlapping();
Schedule::command('alerts:run --type=content_no_future')->dailyAt('09:00')->withoutOverlapping();
Schedule::command('alerts:run --type=campaign_no_spend')->dailyAt('09:00')->withoutOverlapping();
Schedule::command('alerts:run --type=roas_below')->dailyAt('09:00')->withoutOverlapping();

// Alertas semanales
Schedule::command('alerts:run --type=weekly_monday_pending')->weekly()->mondays()->at('08:00')->withoutOverlapping();
Schedule::command('alerts:run --type=production_summary_monday')->weekly()->mondays()->at('08:00')->withoutOverlapping();
Schedule::command('alerts:run --type=weekly_thursday_missing')->weekly()->thursdays()->at('08:00')->withoutOverlapping();
