<?php

namespace App\Services\Metricool;

use App\Models\MetricoolCredential;
use Carbon\CarbonInterface;
use Facebook\WebDriver\Interactions\WebDriverActions;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverElement;
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

    private const ADS_METRIC_MAP = [
        'impressions' => 'Impresiones',
        'spend'       => 'Gasto',
        'clicks'      => 'Clics',
        'conversions' => 'Conversiones',
        'cpm'         => 'CPM',
        'cpc'         => 'CPC',
        'ctr'         => 'CTR',
    ];

    /**
     * Hace login UNA VEZ y scrape todas las redes pedidas en la misma sesión Chrome.
     *
     * $targets es un array asociativo donde cada clave es la red ('facebook', 'instagram', ...)
     * y el valor un array con 'blogId' y 'userId'.
     *
     * Devuelve un array con la misma estructura de claves y el resultado (o excepción) de cada red.
     *
     * $onNetworkComplete, si se pasa, se invoca apenas termina cada red (éxito o error)
     * con (string $network, array $result) — permite persistir resultados parciales
     * para que el polling del frontend refleje el progreso real en vez de saltar de 0% a 100%.
     *
     * @param  array<string, array{blogId: string, userId: string}>  $targets
     * @param  CarbonInterface|null  $start
     * @param  CarbonInterface|null  $end
     * @param  callable(string, array): void|null  $onNetworkComplete
     * @return array<string, array>   keyed by network name
     */
    public function scrapeEvolutions(array $targets, ?CarbonInterface $start = null, ?CarbonInterface $end = null, ?callable $onNetworkComplete = null): array
    {
        $chrome = $this->createLoggedInClient();
        $results = [];

        try {
            foreach ($targets as $network => $cfg) {
                try {
                    $results[$network] = match ($network) {
                        'facebook'  => $this->doFacebookEvolution($chrome, $cfg['blogId'], $cfg['userId'], $start, $end),
                        'instagram' => $this->doInstagramEvolution($chrome, $cfg['blogId'], $cfg['userId'], $start, $end),
                        'tiktok'    => $this->doTiktokEvolution($chrome, $cfg['blogId'], $cfg['userId'], $start, $end),
                        'youtube'   => $this->doYoutubeEvolution($chrome, $cfg['blogId'], $cfg['userId'], $start, $end),
                        'googleAds' => $this->doGoogleAdsEvolution($chrome, $cfg['blogId'], $cfg['userId'], $start, $end),
                        'metaAds'   => $this->doMetaAdsEvolution($chrome, $cfg['blogId'], $cfg['userId'], $start, $end),
                        default     => throw new RuntimeException("Red no soportada: {$network}"),
                    };
                } catch (Throwable $e) {
                    $this->debugScreenshot($chrome, "{$network}-evolution-failed");
                    $results[$network] = ['_error' => $e->getMessage()];
                }

                if ($onNetworkComplete !== null) {
                    $onNetworkComplete($network, $results[$network]);
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

        $chrome->request('GET', $url);
        sleep(0.3);
        $chrome->executeScript('location.reload()');
        // Mismo timing flojo que se vio en Instagram (ver doInstagramEvolution) —
        // 30s a veces no alcanza, y desde que applyDateRange reintenta más
        // (referencias stale, flechas duplicadas) tarda más en total.
        $chrome->waitFor(self::SELECTOR_METRIC_BOX, 60);

        if ($start && $end) {
            $this->applyDateRange($chrome, $start, $end);
            $chrome->waitFor(self::SELECTOR_METRIC_BOX, 60);
        }

        $boxes  = $chrome->getCrawler()->filter(self::SELECTOR_METRIC_BOX);
        $deltas = $this->readIndexedBoxesWithDeltas($chrome, $boxes->count());

        $this->debugScreenshot($chrome, 'facebook-evolution-ok');

        return [
            'followers_growth'            => $this->boxValue($boxes, 0),
            'followers_growth_delta'      => $deltas[0]['delta'] ?? null,
            'followers_growth_delta_pct'  => $deltas[0]['delta_pct'] ?? null,
            'followers_growth_direction'  => $deltas[0]['direction'] ?? null,
            'views'                       => $this->boxValue($boxes, 1),
            'views_delta'                 => $deltas[1]['delta'] ?? null,
            'views_delta_pct'             => $deltas[1]['delta_pct'] ?? null,
            'views_direction'             => $deltas[1]['direction'] ?? null,
        ];
    }

    private function doInstagramEvolution(Client $chrome, string $blogId, string $userId, ?CarbonInterface $start, ?CarbonInterface $end): array
    {
        $url = "https://app.metricool.com/evolution/instagram?blogId={$blogId}&userId={$userId}";

        $chrome->request('GET', $url);

        // Reload forzado para limpiar estado del router Vue entre navegaciones.
        sleep(0.3);
        $chrome->executeScript('location.reload()');

        // La página de Instagram tarda más que las otras redes en pintar los
        // metric boxes (más widgets) — 30s a veces no alcanza: se vio el error
        // "not found within 30 seconds" mientras el screenshot inmediatamente
        // posterior (tomado en el catch) ya mostraba los datos cargados.
        $chrome->waitFor(self::SELECTOR_METRIC_BOX, 60);

        if ($start && $end) {
            $this->applyDateRange($chrome, $start, $end);
            $chrome->waitFor(self::SELECTOR_METRIC_BOX, 20);
        }

        // Dar tiempo a que carguen todas las secciones de la página.
        sleep(1.5);

        $crawler = $chrome->getCrawler();
        $boxes   = $crawler->filter(self::SELECTOR_METRIC_BOX);
        $deltas  = $this->readIndexedBoxesWithDeltas($chrome, $boxes->count());

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
            'followers_total'            => $this->boxValue($boxes, 0),
            'followers_total_delta'      => $deltas[0]['delta'] ?? null,
            'followers_total_delta_pct'  => $deltas[0]['delta_pct'] ?? null,
            'followers_total_direction'  => $deltas[0]['direction'] ?? null,
            'following_total'            => $this->boxValue($boxes, 1),
            'following_total_delta'      => $deltas[1]['delta'] ?? null,
            'following_total_delta_pct'  => $deltas[1]['delta_pct'] ?? null,
            'following_total_direction'  => $deltas[1]['direction'] ?? null,
            'content_total'              => $this->boxValue($boxes, 2),
            'content_total_delta'        => $deltas[2]['delta'] ?? null,
            'content_total_delta_pct'    => $deltas[2]['delta_pct'] ?? null,
            'content_total_direction'    => $deltas[2]['direction'] ?? null,
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

    private function doTiktokEvolution(Client $chrome, string $blogId, string $userId, ?CarbonInterface $start, ?CarbonInterface $end): array
    {
        $url = "https://app.metricool.com/evolution/tiktok?blogId={$blogId}&userId={$userId}";
        $chrome->request('GET', $url);
        sleep(0.3);
        $chrome->executeScript('location.reload()');
        $chrome->waitFor(self::SELECTOR_METRIC_BOX, 30);

        if ($start && $end) {
            $this->applyDateRange($chrome, $start, $end);
            $chrome->waitFor(self::SELECTOR_METRIC_BOX, 20);
        }

        sleep(1);
        $boxes = $this->readLabeledBoxesWithDeltas($chrome);
        $this->debugScreenshot($chrome, 'tiktok-evolution-ok');

        return $this->mapBoxesWithDeltas($boxes, [
            'followers'        => 'Seguidores',
            'posts'            => 'Posts',
            'followers_gained' => 'Adquiridos',
            'followers_lost'   => 'Perdidos',
        ]);
    }

    private function doYoutubeEvolution(Client $chrome, string $blogId, string $userId, ?CarbonInterface $start, ?CarbonInterface $end): array
    {
        $url = "https://app.metricool.com/evolution/youtube?blogId={$blogId}&userId={$userId}";
        $chrome->request('GET', $url);
        sleep(0.3);
        $chrome->executeScript('location.reload()');
        $chrome->waitFor(self::SELECTOR_METRIC_BOX, 30);

        if ($start && $end) {
            $this->applyDateRange($chrome, $start, $end);
            $chrome->waitFor(self::SELECTOR_METRIC_BOX, 20);
        }

        sleep(1);
        $boxes = $this->readLabeledBoxesWithDeltas($chrome);
        $this->debugScreenshot($chrome, 'youtube-evolution-ok');

        return $this->mapBoxesWithDeltas($boxes, [
            'subscribers'        => 'Suscriptores',
            'views'              => 'Reproducciones',
            'revenue'            => 'Revenue',
            'videos'             => 'Vídeos',
            'subscribers_gained' => 'Ganados',
            'subscribers_lost'   => 'Perdidos',
        ]);
    }

    private function doGoogleAdsEvolution(Client $chrome, string $blogId, string $userId, ?CarbonInterface $start, ?CarbonInterface $end): array
    {
        $url = "https://app.metricool.com/evolution/googleAds?blogId={$blogId}&userId={$userId}";
        $chrome->request('GET', $url);
        sleep(0.3);
        $chrome->executeScript('location.reload()');
        $chrome->waitFor(self::SELECTOR_METRIC_BOX, 30);

        if ($start && $end) {
            $this->applyDateRange($chrome, $start, $end);
            $chrome->waitFor(self::SELECTOR_METRIC_BOX, 20);
        }

        sleep(1);
        $boxes = $this->readLabeledBoxesWithDeltas($chrome);
        $this->debugScreenshot($chrome, 'googleAds-evolution-ok');

        return $this->mapBoxesWithDeltas($boxes, self::ADS_METRIC_MAP);
    }

    private function doMetaAdsEvolution(Client $chrome, string $blogId, string $userId, ?CarbonInterface $start, ?CarbonInterface $end): array
    {
        $url = "https://app.metricool.com/evolution/facebookAds?blogId={$blogId}&userId={$userId}";
        $chrome->request('GET', $url);
        sleep(0.3);
        $chrome->executeScript('location.reload()');
        $chrome->waitFor(self::SELECTOR_METRIC_BOX, 60);

        if ($start && $end) {
            $this->applyDateRange($chrome, $start, $end);
            $chrome->waitFor(self::SELECTOR_METRIC_BOX, 20);
        }

        sleep(1);
        $boxes = $this->readLabeledBoxesWithDeltas($chrome);
        $this->debugScreenshot($chrome, 'metaAds-evolution-ok');

        return $this->mapBoxesWithDeltas($boxes, self::ADS_METRIC_MAP);
    }

    /**
     * Traduce el array label => ['value','delta','delta_pct','direction']
     * devuelto por readLabeledBoxesWithDeltas() a un array plano keyed por
     * métrica, con las 4 variantes ({key}, {key}_delta, {key}_delta_pct,
     * {key}_direction) que consume el frontend para pintar valor + flecha de
     * tendencia.
     *
     * @param  array<string, array{value: ?string, delta: ?string, delta_pct: ?string, direction: ?string}>  $boxes
     * @param  array<string, string>  $metricMap  clave interna => label tal como aparece en Metricool
     * @return array<string, mixed>
     */
    private function mapBoxesWithDeltas(array $boxes, array $metricMap): array
    {
        $out = [];
        foreach ($metricMap as $key => $label) {
            $out[$key]                = $boxes[$label]['value'] ?? null;
            $out["{$key}_delta"]      = $boxes[$label]['delta'] ?? null;
            $out["{$key}_delta_pct"]  = $boxes[$label]['delta_pct'] ?? null;
            $out["{$key}_direction"]  = $boxes[$label]['direction'] ?? null;
        }
        $out['_raw'] = $boxes;

        return $out;
    }

    /**
     * Lee todos los [aria-label="Analysis Metric Box"] de la página y devuelve
     * un array label → valor. Para labels duplicados conserva la primera ocurrencia.
     */
    private function readLabeledBoxes(\Symfony\Component\DomCrawler\Crawler $crawler): array
    {
        $result = [];
        $crawler->filter('[aria-label="Analysis Metric Box"]')->each(function ($card) use (&$result) {
            $labelEl = $card->filter('.text-sm.whitespace-nowrap');
            if ($labelEl->count() === 0) {
                return;
            }
            $label = trim($labelEl->first()->text(''));
            if ($label === '' || array_key_exists($label, $result)) {
                return;
            }
            foreach (self::VALUE_CLASSES as $cls) {
                $valueEl = $card->filter('[aria-label="Metric box value"] ' . $cls);
                if ($valueEl->count() > 0) {
                    $val = trim($valueEl->first()->text(''));
                    $result[$label] = ($val !== '' && $val !== '-') ? $val : null;
                    return;
                }
            }
            $result[$label] = null;
        });
        return $result;
    }

    /**
     * Igual que readLabeledBoxes() pero además hace hover real (WebDriverActions,
     * no un evento sintético) sobre cada [aria-label="Analysis Metric Box"] para
     * leer el tooltip de Vuetify (aria-describedby="v-tooltip-v-XXXX") con el
     * delta absoluto y el % de cambio vs. el período de comparación — ese
     * tooltip no existe en el DOM hasta que el hover está activo, por eso no
     * alcanza con leer el Crawler (snapshot estático) como en readLabeledBoxes().
     *
     * Devuelve label => ['value' => ..., 'delta' => ..., 'delta_pct' => ...].
     * Si el tooltip no aparece o no matchea el patrón esperado, delta/delta_pct
     * quedan en null pero el value igual se lee (best-effort, no aborta nada).
     */
    private function readLabeledBoxesWithDeltas(Client $chrome): array
    {
        $result  = [];
        $cards   = $chrome->findElements(WebDriverBy::cssSelector('[aria-label="Analysis Metric Box"]'));
        $actions = new WebDriverActions($chrome);

        foreach ($cards as $card) {
            if (!$card->isDisplayed()) {
                continue;
            }

            $labelEls = $card->findElements(WebDriverBy::cssSelector('.text-sm.whitespace-nowrap'));
            if (empty($labelEls)) {
                continue;
            }
            $label = trim($labelEls[0]->getText());
            if ($label === '' || array_key_exists($label, $result)) {
                continue;
            }

            $result[$label] = $this->readCardValueAndDelta($chrome, $actions, $card, $label);
        }

        return $result;
    }

    /**
     * Igual que readLabeledBoxesWithDeltas() pero para páginas donde los boxes
     * (Facebook, Instagram) se venían leyendo por índice en vez de por label —
     * no todos exponen un label distinguible, así que acá se devuelve la lista
     * en el mismo orden del DOM (índice 0, 1, 2...) en vez de un mapa por label.
     *
     * $expectedCount es la cantidad de "Metric box value" ya leídos por el
     * método de value existente (boxValue/SELECTOR_METRIC_BOX) — si la cantidad
     * de cards "Analysis Metric Box" visibles no coincide, asumimos que la
     * estructura de la página no es la esperada y devolvemos vacío en vez de
     * arriesgarnos a asociar un delta al índice equivocado (la extracción del
     * value, que no depende de este método, sigue funcionando igual).
     */
    private function readIndexedBoxesWithDeltas(Client $chrome, int $expectedCount): array
    {
        $cards   = $chrome->findElements(WebDriverBy::cssSelector('[aria-label="Analysis Metric Box"]'));
        $visible = array_values(array_filter($cards, fn ($card) => $card->isDisplayed()));

        if ($expectedCount === 0 || count($visible) !== $expectedCount) {
            Log::info('Metricool scraper: cantidad de cards con delta no matchea los boxes esperados, se omite delta', [
                'esperado'   => $expectedCount,
                'encontrado' => count($visible),
            ]);

            return [];
        }

        $actions = new WebDriverActions($chrome);
        $result  = [];
        foreach ($visible as $index => $card) {
            $result[$index] = $this->readCardValueAndDelta($chrome, $actions, $card, "box#{$index}");
        }

        return $result;
    }

    /**
     * Lee value/delta/delta_pct/direction de un [aria-label="Analysis Metric
     * Box"] ya localizado.
     *
     * La dirección (arriba/abajo) se lee del ícono <i class="fa-arrow-up|
     * fa-arrow-down"> que Metricool ya renderiza en el DOM estático junto al
     * value — no depende de hover ni de que el tooltip llegue a tiempo, así
     * que es la señal más confiable para decidir la flecha. El delta/delta_pct
     * (con la magnitud del cambio) sigue viniendo del tooltip de Vuetify
     * (aria-describedby="v-tooltip-v-XXXX"), que solo existe en el DOM
     * mientras dura el hover — por eso hace falta un hover real
     * (WebDriverActions, no un evento sintético) para poder leerlo.
     *
     * Si el ícono o el tooltip no aparecen, direction/delta/delta_pct quedan
     * en null pero el value igual se lee (best-effort, no aborta nada).
     *
     * @return array{value: ?string, delta: ?string, delta_pct: ?string, direction: ?string}
     */
    private function readCardValueAndDelta(Client $chrome, WebDriverActions $actions, WebDriverElement $card, string $logLabel): array
    {
        $value = null;
        foreach (self::VALUE_CLASSES as $cls) {
            $valueEls = $card->findElements(WebDriverBy::cssSelector('[aria-label="Metric box value"] ' . $cls));
            if (!empty($valueEls)) {
                $text  = trim($valueEls[0]->getText());
                $value = ($text !== '' && $text !== '-') ? $text : null;
                break;
            }
        }

        $direction = null;
        $iconEls   = $card->findElements(WebDriverBy::cssSelector('[aria-label="Metric box value"] i'));
        if (!empty($iconEls)) {
            $iconClass = (string) $iconEls[0]->getAttribute('class');
            if (str_contains($iconClass, 'fa-arrow-up')) {
                $direction = 'up';
            } elseif (str_contains($iconClass, 'fa-arrow-down')) {
                $direction = 'down';
            }
        }

        $delta = null;
        $deltaPct = null;
        $tooltipId = $card->getAttribute('aria-describedby');

        if ($tooltipId) {
            try {
                $actions->moveToElement($card)->perform();

                $tooltipText = '';
                for ($i = 0; $i < 10; $i++) {
                    $tooltipText = (string) $chrome->executeScript(
                        'return document.getElementById(' . json_encode($tooltipId) . ')?.innerText ?? "";'
                    );
                    if (trim($tooltipText) !== '') {
                        break;
                    }
                    usleep(200_000);
                }

                if (preg_match('/([+-][\d.,]+[a-zA-Z]?)\s*\(([+-]?[\d.,]+%)\)/', $tooltipText, $m)) {
                    $delta    = $m[1];
                    $deltaPct = $m[2];
                } elseif (trim($tooltipText) !== '') {
                    Log::info('Metricool scraper: tooltip de delta no matcheó el patrón esperado', [
                        'label' => $logLabel, 'tooltip_texto' => $tooltipText,
                    ]);
                }
            } catch (Throwable $e) {
                Log::warning('Metricool scraper: no se pudo leer tooltip de delta', [
                    'label' => $logLabel, 'error' => $e->getMessage(),
                ]);
            }
        }

        return ['value' => $value, 'delta' => $delta, 'delta_pct' => $deltaPct, 'direction' => $direction];
    }

    // -------------------------------------------------------------------------
    // Login y utilidades
    // -------------------------------------------------------------------------

    /**
     * Abre el date picker de Metricool y selecciona el rango usando JavaScript
     * para garantizar que los eventos de Vue/v-calendar se disparen correctamente.
     */
    private function applyDateRange(Client $chrome, CarbonInterface $start, CarbonInterface $end): void
    {
        try {
            // Esperar que el botón del date picker sea interactivo (los metric boxes
            // cargan antes que el picker button quede listo).
            sleep(0.5);

            // Abrir el date picker via JS (busca el botón con texto de mes en español)
            $chrome->executeScript("
                const buttons = document.querySelectorAll('button[aria-haspopup=\"menu\"]');
                for (const btn of buttons) {
                    if (/\\d{1,2}\\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.test(btn.textContent)) {
                        btn.click();
                        break;
                    }
                }
            ");

            $chrome->waitFor('.vc-container', 10);
            // Esperar a que el grid de días esté realmente renderizado (el
            // container puede montarse antes de que Vue pinte las celdas).
            $chrome->waitFor('.vc-day-content', 10);
            sleep(0.5);

            // Click en la fecha de inicio, navegando meses si es necesario
            $this->clickCalendarDay($chrome, $start);
            sleep(0.5);

            // Diagnóstico: confirmar que el calendario sigue abierto (esperando
            // la fecha de fin) y no se cerró/reseteó con un solo click.
            $stillOpenAfterStart = (bool) $chrome->executeScript("return !!document.querySelector('.vc-container')");
            $this->debugScreenshot($chrome, 'after-start-click');
            Log::info('Metricool scraper: estado tras click de inicio', [
                'fecha_inicio'   => $start->format('Y-m-d'),
                'calendario_abierto' => $stillOpenAfterStart,
            ]);

            if (!$stillOpenAfterStart) {
                // El click de inicio cerró el calendario solo (probablemente lo
                // tomó como selección de un día único) — reabrir antes de
                // intentar clickear la fecha de fin.
                $chrome->executeScript("
                    const buttons = document.querySelectorAll('button[aria-haspopup=\"menu\"]');
                    for (const btn of buttons) {
                        if (/\\d{1,2}\\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.test(btn.textContent)) {
                            btn.click();
                            break;
                        }
                    }
                ");
                $chrome->waitFor('.vc-day-content', 10);
                sleep(0.5);
            }

            // Click en la fecha de fin, navegando meses si es necesario
            $this->clickCalendarDay($chrome, $end);

            // Esperar que el calendario cierre y Metricool recargue los datos
            sleep(2);

            $this->debugScreenshot($chrome, 'after-date-selection');

            // Verificar que el rango realmente haya quedado aplicado, comparando
            // el texto del botón del picker contra las fechas pedidas. Si no
            // coincide, lo dejamos en el log en vez de asumir que funcionó.
            $appliedText = strtolower((string) $chrome->executeScript("
                const buttons = document.querySelectorAll('button[aria-haspopup=\"menu\"]');
                for (const btn of buttons) {
                    if (/\\d{1,2}\\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.test(btn.textContent)) {
                        return btn.textContent;
                    }
                }
                return '';
            "));

            $startDay = (int) $start->format('j');
            $endDay   = (int) $end->format('j');
            if (!str_contains($appliedText, (string) $startDay) || !str_contains($appliedText, (string) $endDay)) {
                Log::warning('Metricool scraper: el rango aplicado no coincide con el pedido', [
                    'esperado' => $start->format('Y-m-d') . ' - ' . $end->format('Y-m-d'),
                    'boton'    => trim($appliedText),
                ]);
            }

        } catch (Throwable $e) {
            Log::warning('Metricool scraper: error al setear rango de fechas', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Navega el v-calendar hasta que el día sea visible, luego hace click via JS.
     */
    private function clickCalendarDay(Client $chrome, CarbonInterface $date): void
    {
        $dayId   = $date->format('Y-m-d');
        $sel     = ".id-{$dayId} .vc-day-content:not(.vc-disabled)";

        $monthNames = [
            'enero' => 1, 'febrero' => 2, 'marzo' => 3, 'abril' => 4,
            'mayo'  => 5, 'junio'   => 6, 'julio' => 7, 'agosto' => 8,
            'septiembre' => 9, 'octubre' => 10, 'noviembre' => 11, 'diciembre' => 12,
        ];

        $dateValue = $date->year * 12 + $date->month;

        for ($attempt = 0; $attempt < 12; $attempt++) {
            try {
            // v-calendar deja en el DOM clones ocultos de días y títulos de mes
            // mientras anima la transición entre meses (se vieron 4 títulos —
            // "junio julio julio agosto" — para solo 2 paneles realmente
            // visibles). querySelector() devuelve el primer match del DOM, que
            // puede ser justo el clon oculto — por eso hay que pedir TODOS los
            // matches y quedarnos con el que WebDriver considera isDisplayed().
            $dayElements = $chrome->findElements(WebDriverBy::cssSelector($sel));
            $visibleDay  = null;
            foreach ($dayElements as $el) {
                if ($el->isDisplayed()) {
                    $visibleDay = $el;
                    break;
                }
            }

            if ($visibleDay !== null) {
                Log::info('Metricool scraper: día visible, clickeando', [
                    'dia' => $dayId, 'intento' => $attempt, 'matches' => count($dayElements),
                ]);
                // Un click sintético vía dispatchEvent() no es "trusted" (isTrusted:
                // false) — si v-calendar escucha pointerdown/pointerup (en vez de
                // mouse events) o algo en Metricool filtra eventos no confiables,
                // el click no registra la selección aunque no tire error. Usamos el
                // click nativo de WebDriver (evento real de SO) para evitar esa duda.
                try {
                    $visibleDay->click();
                } catch (Throwable $e) {
                    Log::warning('Metricool scraper: click nativo falló, usando fallback JS', [
                        'dia' => $dayId, 'selector' => $sel, 'error' => $e->getMessage(),
                    ]);
                    $chrome->executeScript("document.querySelector('{$sel}')?.click()");
                }
                return;
            }

            // El picker muestra 2 meses lado a lado (.vc-title span por panel),
            // pero por la misma razón de arriba puede haber títulos clonados
            // ocultos en el DOM — nos quedamos solo con los realmente visibles
            // para no calcular un rango de meses "visible" inflado que nunca
            // dispare la navegación por flechas.
            $titleElements = $chrome->findElements(WebDriverBy::cssSelector('.vc-title span'));
            $titles        = [];
            $panelValues   = [];
            foreach ($titleElements as $el) {
                if (!$el->isDisplayed()) {
                    continue;
                }
                $titleText = strtolower(trim($el->getText()));
                $titles[]  = $titleText;
                preg_match('/(\d{4})/', $titleText, $m);
                $year = (int) ($m[1] ?? 0);
                if ($year === 0) {
                    continue;
                }
                $monthStr = trim(preg_replace('/\s*\d{4}/', '', $titleText));
                $month    = $monthNames[$monthStr] ?? 0;
                if ($month === 0) {
                    continue;
                }
                $panelValues[] = $year * 12 + $month;
            }

            // El calendario todavía no terminó de pintar los títulos de mes;
            // esperar en vez de navegar a ciegas.
            if (empty($panelValues)) {
                sleep(0.3);
                continue;
            }

            $minPanel = min($panelValues);
            $maxPanel = max($panelValues);

            if ($dateValue >= $minPanel && $dateValue <= $maxPanel) {
                // El mes pedido ya está entre los paneles visibles pero el día
                // no renderizó como visible todavía (lag de animación/pintado).
                Log::info('Metricool scraper: mes visible pero día aún no renderizado', [
                    'dia' => $dayId, 'intento' => $attempt, 'titulos' => $titles,
                ]);
                sleep(0.3);
                continue;
            }

            // La página tiene 2 selectores de rango (Periodo principal y Periodo
            // de comparación), cada uno con su propio v-calendar — ambos pueden
            // matchear '.vc-arrow.vc-prev/next' en el DOM aunque solo uno esté
            // visible. querySelector() sin filtrar puede pegarle a la flecha del
            // picker equivocado (por eso "movio: true" pero el título nunca
            // cambiaba). Igual que con días y títulos, nos quedamos con la
            // flecha que WebDriver ve realmente visible.
            $goBack   = $dateValue < $minPanel;
            $navClass = $goBack ? 'vc-prev' : 'vc-next';
            $navElements = $chrome->findElements(WebDriverBy::cssSelector(".vc-arrow.{$navClass}:not([disabled])"));
            $navBtn      = null;
            foreach ($navElements as $el) {
                if ($el->isDisplayed()) {
                    $navBtn = $el;
                    break;
                }
            }

            $moved = false;
            if ($navBtn !== null) {
                $navBtn->click();
                $moved = true;
            }

            Log::info('Metricool scraper: navegando calendario', [
                'dia' => $dayId, 'intento' => $attempt, 'titulos' => $titles,
                'direccion' => $goBack ? 'prev' : 'next', 'movio' => $moved,
                'matches' => count($navElements),
            ]);

            if (!$moved) {
                break;
            }

            sleep(0.3);
            } catch (Throwable $e) {
                // "stale element reference" es esperable: v-calendar reemplaza
                // los nodos del panel apenas termina la transición de mes, así
                // que un elemento leído justo antes de eso puede quedar viejo
                // a mitad de esta misma iteración. Reintentar en vez de abortar
                // todo applyDateRange por una carrera de renderizado.
                Log::info('Metricool scraper: referencia stale, reintentando', [
                    'dia' => $dayId, 'intento' => $attempt, 'error' => $e->getMessage(),
                ]);
                sleep(0.3);
            }
        }

        $this->debugScreenshot($chrome, "calendar-click-failed-{$dayId}");
        Log::warning("Metricool scraper: no se pudo clickear el día {$dayId} en el calendario");
    }

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

        // Persistir el perfil de Chrome entre ejecuciones: en la segunda corrida
        // Chrome ya tiene el JS/CSS de Metricool en disco y no los vuelve a bajar.
        $profileDir = storage_path('app/private/chrome-profile');
        if (!is_dir($profileDir)) {
            mkdir($profileDir, 0755, recursive: true);
        }

        $client = Client::createChromeClient($driverBinary, [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1440,1000',
            '--headless',
            "--user-data-dir={$profileDir}",
        ]);

        try {
            $client->request('GET', $loginUrl);

            // Si la sesión persiste del run anterior, el login ya está hecho
            if (!str_contains($client->getCurrentURL(), '/login')) {
                return $client;
            }

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
