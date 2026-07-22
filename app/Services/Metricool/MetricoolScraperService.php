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
 *
 * IMPORTANTE: siempre usar scrapeEvolutions() para combinar varias redes en una
 * sola sesión Chrome — evita conflictos de puerto y reduce el tiempo total.
 */
class MetricoolScraperService
{
    private const SELECTOR_METRIC_BOX   = '[aria-label="Metric box value"]';
    private const SELECTOR_METRIC_VALUE = '.text-3xl';

    private const LOGIN_FIELD_SELECTOR    = 'input[name="email"]';
    private const PASSWORD_FIELD_SELECTOR = 'input[name="password"]';
    private const SUBMIT_SELECTOR         = 'button';

    /**
     * Hace login UNA VEZ y scrape todas las redes pedidas en la misma sesión Chrome.
     *
     * $targets es un array asociativo donde cada clave es la red ('facebook', 'instagram', ...)
     * y el valor un array con 'blogId' y 'userId'.
     *
     * Devuelve un array con la misma estructura de claves y el resultado (o excepción) de cada red.
     *
     * @param  array<string, array{blogId: string, userId: string}>  $targets
     * @param  CarbonInterface|null  $start
     * @param  CarbonInterface|null  $end
     * @return array<string, array>   keyed by network name
     */
    public function scrapeEvolutions(array $targets, ?CarbonInterface $start = null, ?CarbonInterface $end = null): array
    {
        $chrome = $this->createLoggedInClient();
        $results = [];

        try {
            foreach ($targets as $network => $cfg) {
                try {
                    $results[$network] = match ($network) {
                        'facebook'  => $this->doFacebookEvolution($chrome, $cfg['blogId'], $cfg['userId'], $start, $end),
                        'instagram' => $this->doInstagramEvolution($chrome, $cfg['blogId'], $cfg['userId'], $start, $end),
                        default     => throw new RuntimeException("Red no soportada: {$network}"),
                    };
                } catch (Throwable $e) {
                    $this->debugScreenshot($chrome, "{$network}-evolution-failed");
                    $results[$network] = ['_error' => $e->getMessage()];
                }
            }
        } finally {
            $chrome->quit();
        }

        return $results;
    }

    // -------------------------------------------------------------------------
    // Métodos internos — reciben un client ya logueado
    // -------------------------------------------------------------------------

    private function doFacebookEvolution(Client $chrome, string $blogId, string $userId, ?CarbonInterface $start, ?CarbonInterface $end): array
    {
        $url = "https://app.metricool.com/evolution/facebookPage?blogId={$blogId}&userId={$userId}";

        if ($start && $end) {
            $url .= '&from=' . $start->format('Ymd') . '&to=' . $end->format('Ymd');
        }

        $chrome->request('GET', $url);
        $chrome->waitFor(self::SELECTOR_METRIC_BOX, 20);

        $boxes = $chrome->getCrawler()->filter(self::SELECTOR_METRIC_BOX);

        $this->debugScreenshot($chrome, 'facebook-evolution-ok');

        return [
            'followers_growth' => trim($boxes->eq(0)->filter(self::SELECTOR_METRIC_VALUE)->text('')),
            'views'            => trim($boxes->eq(1)->filter(self::SELECTOR_METRIC_VALUE)->text('')),
        ];
    }

    private function doInstagramEvolution(Client $chrome, string $blogId, string $userId, ?CarbonInterface $start, ?CarbonInterface $end): array
    {
        $url = "https://app.metricool.com/evolution/instagram?blogId={$blogId}&userId={$userId}";

        if ($start && $end) {
            $url .= '&from=' . $start->format('Ymd') . '&to=' . $end->format('Ymd');
        }

        $chrome->request('GET', $url);
        $chrome->waitFor(self::SELECTOR_METRIC_BOX, 20);

        // Dar tiempo a que carguen todas las secciones de la página.
        sleep(3);

        $crawler = $chrome->getCrawler();
        $boxes   = $crawler->filter(self::SELECTOR_METRIC_BOX);
        $count   = $boxes->count();

        $this->debugScreenshot($chrome, 'instagram-evolution-ok');

        $val = function (int $i) use ($boxes, $count): ?string {
            return $count > $i
                ? trim($boxes->eq($i)->filter(self::SELECTOR_METRIC_VALUE)->text('')) ?: null
                : null;
        };

        // Mapa completo de todos los boxes para poder identificar los índices correctos.
        $allBoxes = [];
        for ($i = 0; $i < $count; $i++) {
            $allBoxes[$i] = $val($i);
        }

        return [
            // Fila superior (3 boxes coloreados) — índices confirmados
            'followers_total'    => $val(0),
            'following_total'    => $val(1),
            'content_total'      => $val(2),
            // Fila inferior (6 boxes grises) — índices por confirmar con _all_boxes
            'followers_gained'   => $val(3),
            'followers_daily'    => null,
            'followers_per_post' => null,
            'following_net'      => null,
            'posts_per_day'      => null,
            'posts_per_week'     => null,
            '_boxes_count'       => $count,
            '_all_boxes'         => $allBoxes,
        ];
    }

    // -------------------------------------------------------------------------
    // Login y utilidades
    // -------------------------------------------------------------------------

    private function createLoggedInClient(): Client
    {
        $email    = MetricoolCredential::getEmail() ?: (string) config('metricool.scrape_email');
        $password = MetricoolCredential::getPassword() ?: (string) config('metricool.scrape_password');
        $loginUrl = (string) config('metricool.login_url');

        if ($email === '' || $password === '') {
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

            $buttons      = $crawler->filter(self::SUBMIT_SELECTOR);
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
            Log::info('Metricool scraper: screenshot', ['path' => $path]);

            return $path;
        } catch (Throwable $e) {
            Log::warning('Metricool scraper: no se pudo tomar screenshot', ['error' => $e->getMessage()]);

            return null;
        }
    }
}
