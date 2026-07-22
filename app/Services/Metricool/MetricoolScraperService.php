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
    private const SELECTOR_METRIC_BOX = '[aria-label="Metric box value"]';

    // Los boxes grandes (coloreados) usan .text-3xl; los grises pequeños usan .text-2xl o .text-xl.
    // Se prueban en orden de mayor a menor para capturar el valor numérico principal del box.
    private const VALUE_CLASSES = ['.text-3xl', '.text-4xl', '.text-2xl', '.text-xl', '.text-lg'];

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
            'followers_growth' => $this->boxValue($boxes, 0),
            'views'            => $this->boxValue($boxes, 1),
        ];
    }

    private function doInstagramEvolution(Client $chrome, string $blogId, string $userId, ?CarbonInterface $start, ?CarbonInterface $end): array
    {
        $url = "https://app.metricool.com/evolution/instagram?blogId={$blogId}&userId={$userId}";

        if ($start && $end) {
            $url .= '&from=' . $start->format('Ymd') . '&to=' . $end->format('Ymd');
        }

        $chrome->request('GET', $url);

        // La SPA de Metricool (Vue) mantiene estado del router entre navegaciones.
        // Un reload forzado limpia ese estado y garantiza que los componentes
        // de métricas se monten desde cero.
        sleep(1);
        $chrome->executeScript('location.reload()');

        $chrome->waitFor(self::SELECTOR_METRIC_BOX, 30);

        // Dar tiempo a que carguen todas las secciones de la página.
        sleep(3);

        $crawler = $chrome->getCrawler();
        $boxes   = $crawler->filter(self::SELECTOR_METRIC_BOX);
        $count   = $boxes->count();

        $this->debugScreenshot($chrome, 'instagram-evolution-ok');

        // Boxes grises (delta boxes) dentro de #growth: tienen .delta-box-wrapper,
        // el valor en .text-2xl y el label en .text-xs. Se mapean por label text
        // para no depender de índices que cambian con el layout.
        $deltaBoxes = [];
        $crawler->filter('#growth .delta-box-wrapper')->each(function ($wrapper) use (&$deltaBoxes) {
            $valueEl = $wrapper->filter('.text-2xl');
            $labelEl = $wrapper->filter('.text-xs');
            if ($valueEl->count() > 0 && $labelEl->count() > 0) {
                $label = trim($labelEl->first()->text(''));
                $value = trim($valueEl->first()->text(''));
                if ($label !== '') {
                    $deltaBoxes[$label] = $value !== '' ? $value : null;
                }
            }
        });

        return [
            // Top 3 boxes coloreados (aria-label="Metric box value", índices 0-2)
            'followers_total'    => $this->boxValue($boxes, 0),
            'following_total'    => $this->boxValue($boxes, 1),
            'content_total'      => $this->boxValue($boxes, 2),
            // 6 boxes grises de #growth — mapeados por label text
            'followers_gained'   => $deltaBoxes['Seguidores'] ?? null,
            'followers_daily'    => $deltaBoxes['Seguidores diarios'] ?? null,
            'followers_per_post' => $deltaBoxes['Seguidores por publicación'] ?? null,
            'following_net'      => $deltaBoxes['Siguiendo'] ?? null,
            'posts_per_day'      => $deltaBoxes['Publicaciones por día'] ?? null,
            'posts_per_week'     => $deltaBoxes['Publicaciones por semana'] ?? null,
            '_delta_boxes'       => $deltaBoxes, // debug: labels y valores encontrados
        ];
    }

    // -------------------------------------------------------------------------
    // Login y utilidades
    // -------------------------------------------------------------------------

    /**
     * Extrae el valor numérico de un metric box probando varias clases de texto.
     * Los boxes grandes (coloreados) usan .text-3xl; los grises pequeños usan .text-2xl/.text-xl.
     */
    private function boxValue(\Symfony\Component\DomCrawler\Crawler $boxes, int $index): ?string
    {
        if ($boxes->count() <= $index) {
            return null;
        }
        $box = $boxes->eq($index);
        foreach (self::VALUE_CLASSES as $cls) {
            $el = $box->filter($cls);
            if ($el->count() > 0) {
                $text = trim($el->first()->text(''));
                if ($text !== '' && $text !== '-') {
                    return $text;
                }
            }
        }
        return null;
    }

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
