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
    private const SELECTOR_METRIC_BOX   = '[aria-label="Metric box value"]';
    private const SELECTOR_METRIC_VALUE = '.text-3xl';

    private const LOGIN_FIELD_SELECTOR    = 'input[name="email"]';
    private const PASSWORD_FIELD_SELECTOR = 'input[name="password"]';
    private const SUBMIT_SELECTOR         = 'button';

    public function instagramEvolution(string $blogId, string $userId, ?CarbonInterface $start = null, ?CarbonInterface $end = null): array
    {
        $client = $this->createLoggedInClient();

        try {
            $url = "https://app.metricool.com/evolution/instagram?blogId={$blogId}&userId={$userId}";

            if ($start !== null && $end !== null) {
                $url .= '&from=' . $start->format('Ymd') . '&to=' . $end->format('Ymd');
            }

            $client->request('GET', $url);
            $client->waitFor(self::SELECTOR_METRIC_BOX, 20);

            // Esperar a que los 9 boxes (3 arriba + 6 abajo) estén cargados.
            // Si en 5s solo hay 3, seguimos igual y reportamos _boxes_count.
            try {
                $client->wait(5)->until(
                    fn () => $client->getCrawler()->filter(self::SELECTOR_METRIC_BOX)->count() >= 9
                );
            } catch (\Throwable) {
                // no pasa nada — algunos clientes pueden tener menos boxes
            }

            $crawler = $client->getCrawler();
            $boxes   = $crawler->filter(self::SELECTOR_METRIC_BOX);
            $count   = $boxes->count();

            $screenshotPath = $this->debugScreenshot($client, 'instagram-evolution-ok');

            $val = function (int $i) use ($boxes, $count): ?string {
                return $count > $i
                    ? trim($boxes->eq($i)->filter(self::SELECTOR_METRIC_VALUE)->text('')) ?: null
                    : null;
            };

            return [
                // Fila superior (3 boxes coloreados)
                'followers_total'    => $val(0),   // Seguidores (total acumulado)
                'following_total'    => $val(1),   // Siguiendo
                'content_total'      => $val(2),   // Contenido total
                // Fila inferior (6 boxes grises)
                'followers_gained'   => $val(3),   // Seguidores (ganados en el período)
                'followers_daily'    => $val(4),   // Seguidores diarios
                'followers_per_post' => $val(5),   // Seguidores por publicación
                'following_net'      => $val(6),   // Siguiendo (delta)
                'posts_per_day'      => $val(7),   // Publicaciones por día
                'posts_per_week'     => $val(8),   // Publicaciones por semana
                'screenshot'         => $screenshotPath,
                '_boxes_count'       => $count,
            ];
        } catch (Throwable $e) {
            $this->debugScreenshot($client, 'instagram-evolution-failed');
            throw $e;
        } finally {
            $client->quit();
        }
    }

    public function facebookEvolution(string $blogId, string $userId, ?CarbonInterface $start = null, ?CarbonInterface $end = null): array
    {
        $client = $this->createLoggedInClient();

        try {
            $url = "https://app.metricool.com/evolution/facebook?blogId={$blogId}&userId={$userId}";

            // Intento de fijar el rango vía querystring, mismo formato (Ymd) que usa
            // la API oficial. La página es una SPA (Vuetify) — no está confirmado que
            // lea el rango desde acá; si el screenshot de diagnóstico muestra el rango
            // por defecto en vez de este, hay que automatizar el selector de fechas de
            // la UI en su lugar (necesitamos los selectores de ese widget).
            if ($start !== null && $end !== null) {
                $url .= '&from=' . $start->format('Ymd') . '&to=' . $end->format('Ymd');
            }

            $client->request('GET', $url);
            $client->waitFor(self::SELECTOR_METRIC_BOX, 20);

            $crawler = $client->getCrawler();
            $boxes   = $crawler->filter(self::SELECTOR_METRIC_BOX);

            // Screenshot siempre para confirmar el rango de fechas mostrado en pantalla.
            $screenshotPath = $this->debugScreenshot($client, 'facebook-evolution-ok');

            return [
                'followers_growth' => trim($boxes->eq(0)->filter(self::SELECTOR_METRIC_VALUE)->text('')),
                'views'            => trim($boxes->eq(1)->filter(self::SELECTOR_METRIC_VALUE)->text('')),
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
