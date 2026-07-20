<?php

namespace App\Services\Metricool;

use App\Models\MetricoolCredential;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\Panther\Client;
use Throwable;

/**
 * Scrapea valores que hoy no expone la API oficial de Metricool (MetricoolClient),
 * logueándose con usuario/contraseña vía un Chrome headless (Symfony Panther) y
 * leyendo el DOM ya renderizado del dashboard. Selectores atados a la estructura
 * actual de app.metricool.com — se rompen si Metricool cambia el layout.
 */
class MetricoolScraperService
{
    private const SELECTOR_FOLLOWERS_GROWTH = '#app > div > div > div:nth-child(1) > main > div > div > div > div > div.evolution-facebookPage.base-grid.mt-4.px-2 > div:nth-child(3) > div:nth-child(2) > div > div.flex.items-start.flex-wrap.gap-3 > div.v-item-group.v-theme--black-and-white.flex.w-full.md\:w-auto.md\:ml-auto.gap-3.flex-col.md\:flex-row.flex-wrap.justify-end.pb-4 > div:nth-child(1) > div > div:nth-child(2) > div.flex.justify-center.items-center > div:nth-child(1) > div';

    private const SELECTOR_VIEWS = '#app > div > div > div:nth-child(1) > main > div > div > div > div > div.evolution-facebookPage.base-grid.mt-4.px-2 > div:nth-child(3) > div:nth-child(2) > div > div.flex.items-start.flex-wrap.gap-3 > div.v-item-group.v-theme--black-and-white.flex.w-full.md\:w-auto.md\:ml-auto.gap-3.flex-col.md\:flex-row.flex-wrap.justify-end.pb-4 > div:nth-child(2) > div > div:nth-child(3) > div.text-sm.whitespace-nowrap';

    private const LOGIN_FIELD_SELECTOR    = 'input[name="email"]';
    private const PASSWORD_FIELD_SELECTOR = 'input[name="password"]';
    private const SUBMIT_SELECTOR         = 'button';

    public function facebookEvolution(string $blogId, string $userId, ?CarbonInterface $start = null, ?CarbonInterface $end = null): array
    {
        $client = $this->createLoggedInClient();

        try {
            $url = "https://app.metricool.com/evolution/facebookPage?blogId={$blogId}&userId={$userId}";

            // Intento de fijar el rango vía querystring, mismo formato (Ymd) que usa
            // la API oficial. La página es una SPA (Vuetify) — no está confirmado que
            // lea el rango desde acá; si el screenshot de diagnóstico muestra el rango
            // por defecto en vez de este, hay que automatizar el selector de fechas de
            // la UI en su lugar (necesitamos los selectores de ese widget).
            if ($start !== null && $end !== null) {
                $url .= '&from=' . $start->format('Ymd') . '&to=' . $end->format('Ymd');
            }

            $client->request('GET', $url);
            $client->waitFor(self::SELECTOR_FOLLOWERS_GROWTH, 20);

            $crawler = $client->getCrawler();

            // Screenshot siempre (no solo en error) para poder confirmar a simple
            // vista si el rango de fechas mostrado en pantalla es el pedido.
            $screenshotPath = $this->debugScreenshot($client, 'facebook-evolution-ok');

            return [
                'followers_growth' => trim($crawler->filter(self::SELECTOR_FOLLOWERS_GROWTH)->text('')),
                'views'            => trim($crawler->filter(self::SELECTOR_VIEWS)->text('')),
                'screenshot'       => $screenshotPath,
            ];
        } catch (Throwable $e) {
            $this->debugScreenshot($client, 'facebook-evolution-failed');
            throw $e;
        } finally {
            $client->quit();
        }
    }

    private function createLoggedInClient(): Client
    {
        // La DB (editable desde /admin/metricool-credentials) manda; el .env
        // queda como fallback para no romper lo ya desplegado.
        $email    = MetricoolCredential::getEmail() ?: (string) config('metricool.scrape_email');
        $password = MetricoolCredential::getPassword() ?: (string) config('metricool.scrape_password');
        $loginUrl = (string) config('metricool.login_url');

        if ($email === '' || $password === '' || $email === null || $password === null) {
            throw new RuntimeException('Faltan credenciales de Metricool: cargalas en /admin/metricool-credentials o en METRICOOL_SCRAPE_EMAIL / METRICOOL_SCRAPE_PASSWORD (.env)');
        }

        $driverBinary = config('metricool.chrome_driver_binary') ?: null;

        $client = Client::createChromeClient($driverBinary, [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1440,1000',
            '--headless',
        ]);

        try {
            $client->request('GET', $loginUrl);
            $client->waitFor(self::LOGIN_FIELD_SELECTOR, 15);

            $crawler = $client->getCrawler();
            $crawler->filter(self::LOGIN_FIELD_SELECTOR)->first()->sendKeys($email);
            $crawler->filter(self::PASSWORD_FIELD_SELECTOR)->first()->sendKeys($password);

            // Click the "Access" button specifically (not Google/Facebook buttons)
            $buttons = $crawler->filter(self::SUBMIT_SELECTOR);
            $accessButton = $buttons->reduce(fn($node) => str_contains(strtolower($node->text()), 'access'));
            ($accessButton->count() > 0 ? $accessButton : $buttons->last())->click();

            $client->wait(20)->until(
                fn () => !str_contains($client->getCurrentURL(), '/login')
            );
        } catch (Throwable $e) {
            $this->debugScreenshot($client, 'login-failed');
            $client->quit();
            throw new RuntimeException('No se pudo loguear en Metricool: ' . $e->getMessage(), previous: $e);
        }

        return $client;
    }

    private function debugScreenshot(Client $client, string $label): ?string
    {
        try {
            $path = storage_path('app/private/metricool-debug/' . $label . '-' . now()->format('Ymd-His') . '.png');
            if (!is_dir(dirname($path))) {
                mkdir(dirname($path), 0755, recursive: true);
            }
            $client->takeScreenshot($path);
            Log::warning('Metricool scraper: screenshot de diagnóstico guardado', ['path' => $path]);

            return $path;
        } catch (Throwable $e) {
            Log::warning('Metricool scraper: no se pudo tomar screenshot de diagnóstico', ['error' => $e->getMessage()]);

            return null;
        }
    }
}
