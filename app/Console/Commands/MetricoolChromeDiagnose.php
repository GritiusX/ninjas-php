<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class MetricoolChromeDiagnose extends Command
{
    protected $signature = 'metricool:chrome-diagnose
        {--fix : Mata procesos de chrome/chromedriver colgados y borra los locks del perfil persistido}';

    protected $description = 'Diagnostica por qué Chrome no arranca para el scraper de Metricool (perfil trabado, procesos colgados, disco, memoria, versiones)';

    private const LOCK_FILES = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];

    public function handle(): int
    {
        $this->checkVersions();
        $this->newLine();
        $this->checkProcesses();
        $this->newLine();
        $this->checkProfileLocks();
        $this->newLine();
        $this->checkDiskSpace();
        $this->newLine();
        $this->checkMemory();

        return self::SUCCESS;
    }

    private function checkVersions(): void
    {
        $this->components->info('Versiones de Chrome / ChromeDriver');

        $chromeBinaries = array_filter([
            env('PANTHER_CHROME_BINARY'),
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
        ]);

        $foundChrome = false;
        foreach ($chromeBinaries as $binary) {
            if ($binary && is_executable($binary)) {
                $this->runVersionCommand($binary);
                $foundChrome = true;
                break;
            }
        }
        if (!$foundChrome) {
            $this->warn('  No encontré un binario de Chrome en las rutas usuales. Si está en otro lado, definí PANTHER_CHROME_BINARY.');
        }

        $driverBinary = config('metricool.chrome_driver_binary') ?: 'chromedriver';
        $this->runVersionCommand($driverBinary);
    }

    private function runVersionCommand(string $binary): void
    {
        if (PHP_OS_FAMILY === 'Windows') {
            $this->warn("  Chequeo de versión no soportado en Windows (solo aplica al servidor Linux): {$binary}");
            return;
        }

        $output    = [];
        $exitCode  = 0;
        exec(escapeshellarg($binary) . ' --version 2>&1', $output, $exitCode);

        if ($exitCode === 0 && !empty($output)) {
            $this->line("  {$binary}: " . trim(implode(' ', $output)));
        } else {
            $this->warn("  No pude ejecutar '{$binary} --version' (¿existe? ¿tiene permisos de ejecución?)");
        }
    }

    private function checkProcesses(): void
    {
        $this->components->info('Procesos de Chrome / ChromeDriver corriendo');

        if (PHP_OS_FAMILY === 'Windows') {
            $this->warn('  Chequeo de procesos no soportado en Windows (solo aplica al servidor Linux).');
            return;
        }

        exec("ps aux | grep -E 'chromedriver|chrome --' | grep -v grep", $lines);

        if (empty($lines)) {
            $this->line('  Ninguno. Bien.');
            return;
        }

        foreach ($lines as $line) {
            $this->line("  {$line}");
        }
        $this->warn(sprintf('  %d proceso(s) colgado(s) encontrado(s). Pueden estar reteniendo el lock del perfil de Chrome.', count($lines)));

        if ($this->option('fix')) {
            exec('pkill -f chromedriver 2>/dev/null');
            exec('pkill -f "chrome --" 2>/dev/null');
            $this->components->info('  Maté los procesos colgados (pkill chromedriver / chrome --).');
        } else {
            $this->comment('  Corré con --fix para matarlos.');
        }
    }

    private function checkProfileLocks(): void
    {
        $this->components->info('Locks del perfil de Chrome persistido');

        $profileDir = storage_path('app/private/chrome-profile');

        if (!is_dir($profileDir)) {
            $this->line("  {$profileDir} no existe todavía (se crea en la primera corrida). Nada que chequear.");
            return;
        }

        $foundLocks = [];
        foreach (self::LOCK_FILES as $lockFile) {
            $path = $profileDir . DIRECTORY_SEPARATOR . $lockFile;
            if (file_exists($path) || is_link($path)) {
                $foundLocks[] = $path;
            }
        }

        if (empty($foundLocks)) {
            $this->line('  Sin locks. Bien.');
            return;
        }

        foreach ($foundLocks as $path) {
            $this->warn("  Encontrado: {$path}");
        }
        $this->warn('  Estos locks quedan cuando Chrome se mata de forma abrupta (pkill, OOM, timeout de job) y hacen que TODA corrida futura falle igual, aunque reintentes.');

        if ($this->option('fix')) {
            foreach ($foundLocks as $path) {
                @unlink($path);
            }
            $this->components->info('  Locks borrados.');
        } else {
            $this->comment('  Corré con --fix para borrarlos.');
        }
    }

    private function checkDiskSpace(): void
    {
        $this->components->info('Espacio en disco');

        $path  = storage_path();
        $free  = @disk_free_space($path);
        $total = @disk_total_space($path);

        if ($free === false || $total === false || $total === 0) {
            $this->warn('  No pude leer el espacio en disco.');
            return;
        }

        $freeGb  = round($free / 1024 ** 3, 2);
        $totalGb = round($total / 1024 ** 3, 2);
        $pctFree = round(($free / $total) * 100, 1);

        $this->line("  {$freeGb} GB libres de {$totalGb} GB ({$pctFree}% libre) en {$path}");

        if ($pctFree < 10) {
            $this->warn('  Menos del 10% libre: esto puede estar impidiendo que Chrome arranque.');
        }
    }

    private function checkMemory(): void
    {
        $this->components->info('Memoria disponible');

        if (PHP_OS_FAMILY === 'Windows' || !is_readable('/proc/meminfo')) {
            $this->warn('  No pude leer /proc/meminfo (solo aplica al servidor Linux).');
            return;
        }

        $meminfo = file_get_contents('/proc/meminfo');
        preg_match('/MemTotal:\s+(\d+) kB/', $meminfo, $total);
        preg_match('/MemAvailable:\s+(\d+) kB/', $meminfo, $available);

        if (empty($total) || empty($available)) {
            $this->warn('  No pude parsear /proc/meminfo.');
            return;
        }

        $totalMb  = round(((int) $total[1]) / 1024);
        $availMb  = round(((int) $available[1]) / 1024);
        $pctAvail = $totalMb > 0 ? round(($availMb / $totalMb) * 100, 1) : 0;

        $this->line("  {$availMb} MB disponibles de {$totalMb} MB ({$pctAvail}% disponible)");

        if ($pctAvail < 10) {
            $this->warn('  Menos del 10% de RAM disponible: Chrome puede estar muriendo por falta de memoria (OOM) al arrancar.');
        }
    }
}
