# Corridas mensuales comparables para metrics2 (scraper)

> Nota para quien ejecute este plan: este documento fue armado en una sesión que solo tenía acceso a una copia/checkout del repo, no al repo real. Antes de implementar, confirmar que las rutas y nombres de archivo de abajo siguen existiendo tal cual (pueden haber cambiado desde que se escribió este plan). La sección "Contexto técnico relevado" resume TODO lo que se investigó en el repo para que se pueda ejecutar sin necesitar el historial de chat original.

## Contexto técnico relevado (repo: `ninjas`, stack Laravel + Inertia/React)

Este proyecto tiene **dos pipelines de métricas de redes sociales, independientes entre sí**:

### Pipeline v1 — `metrics` (vía API oficial de Metricool) — NO TOCAR en este trabajo
- Tabla `monthly_snapshots` (migración `database/migrations/2026_05_15_000002_create_monthly_snapshots_table.php`): `client_id, year, month, area, metric_key, value (decimal 18,4 nullable), meta (json), synced_at`. Unique `(client_id, year, month, area, metric_key)`.
- Modelo `app/Models/MonthlySnapshot.php`.
- Job `app/Jobs/SyncClientMetricsForMonth.php`: arma un `MetricoolBundle` vía `app/Services/Metricool/MetricoolBundleBuilder.php` (llama a la API oficial de Metricool, clase `app/Services/Metricool/MetricoolClient.php`), le suma datos de Google Ads (`GoogleAdsService`), calcula KPIs con `app/Services/Metricool/KpiCalculator.php` (métodos `awareness()`, `content()`, `community()`, `ads()`, `system()`, cada uno devuelve filas `['area'=>.., 'metric_key'=>.., 'value'=>..]`) y hace `updateOrCreate` en `MonthlySnapshot`.
- Comandos: `app/Console/Commands/SyncMetricoolMonthly.php` (`metricool:sync`) y `app/Console/Commands/SyncMetricoolStaggered.php` (`metricool:sync-staggered`, cliente por cliente con delay).
- Scheduler ya activo en `routes/console.php`: sync diaria del mes actual a las 05:00 UTC, y sync de cierre del mes anterior el día 2 de cada mes a las 05:00 UTC.
- Controlador `app/Http/Controllers/MetricsController.php`: `index()` lista clientes con estado de sync, `show()` ya arma comparación mes actual vs. mes anterior por área, con selector de mes (`available months`).
- Cubre: Instagram, Facebook (orgánico + ads), Google Ads. **No cubre TikTok ni YouTube** (limitación de la API/plan de Metricool).

### Pipeline v2 — `metrics2` (scraper Selenium/Panther) — ES EL QUE HAY QUE EXTENDER
- Motivo de existir: la API de Metricool no expone datos de TikTok/YouTube/Meta Ads (o el cliente no tiene ese acceso), entonces se scrapea directamente el dashboard web de Metricool (`app.metricool.com`) logueado con usuario/contraseña vía Chrome headless (Symfony Panther).
- Tabla actual `metricool_scrape_cache` (migración `database/migrations/2026_07_21_000001_create_metricool_scrape_cache_table.php`): `client_id, network, range_start, range_end, data (json), scraped_at`. Unique `(client_id, network, range_start, range_end)`. Es un **cache por rango arbitrario**, no una serie mensual comparable.
- Modelo `app/Models/MetricoolScrapeCache.php`: métodos `store()`, `findCached()`, `findRecent()`.
- Servicio central `app/Services/Metricool/MetricoolScraperService.php`, método público `scrapeEvolutions(array $targets, ?CarbonInterface $start, ?CarbonInterface $end, ?callable $onNetworkComplete)`: abre UNA sesión Chrome logueada y por cada red en `$targets` (claves posibles: `facebook`, `instagram`, `tiktok`, `youtube`, `googleAds`, `metaAds`) llama a un método interno `do{Red}Evolution($chrome, $blogId, $userId, $start, $end)` que lee el DOM y devuelve un array asociativo. **Reutilizar este método tal cual**, no reimplementar el scraping.
  - Errores por red se capturan dentro de `scrapeEvolutions` (try/catch por red) y devuelven `['_error' => mensaje]` para esa red, sin tirar abajo las demás.
  - Los valores devueltos hoy son **strings tal cual aparecen en el DOM** (ej. "1.2K", "+3.4%"), sin parsear a número.
  - Campos por red (nombres de las claves del array devuelto por cada `do*Evolution`, ver método `scrapeEvolutions` líneas ~64-95 y los métodos internos a partir de la línea ~100):
    - Facebook: `followers_growth(_delta/_delta_pct/_direction)`, `views(_delta/_delta_pct/_direction)`.
    - Instagram: `followers_total`, `following_total`, `content_total` (cada uno con `_delta/_delta_pct/_direction`), más `followers_gained`, `followers_daily`, `followers_per_post`, `following_net`, `posts_per_day`, `posts_per_week`, y `_delta_boxes` (debug, ignorar).
    - TikTok: `followers`, `posts`, `followers_gained`, `followers_lost` (+ variantes) y `_raw` (debug, ignorar).
    - YouTube: `subscribers`, `views`, `revenue`, `videos`, `subscribers_gained`, `subscribers_lost` (+ variantes) y `_raw` (debug, ignorar).
    - Google Ads / Meta Ads: `impressions`, `spend`, `clicks`, `conversions`, `cpm`, `cpc`, `ctr` (+ variantes) y `_raw` (debug, ignorar).
- Job actual `app/Jobs/ScrapeMetricoolEvolution.php`: recibe `clientId, networks[], blogId, userId, rangeStart, rangeEnd, forceDateRange`, llama a `scrapeEvolutions()` y en el callback `onNetworkComplete` persiste cada red apenas termina en `MetricoolScrapeCache::store()`. Si el job falla del todo (`failed()`), igual guarda una fila con `data=['_error'=>...]` para que el polling del frontend no quede esperando. **Patrón a imitar** para el nuevo job mensual (persistir apenas termina cada red, y garantizar una fila aunque falle).
- Controlador `app/Http/Controllers/Metrics2Controller.php`: `list()` (índice de clientes con conteo de redes cacheadas) y `show()` (dispara `ScrapeMetricoolEvolution::dispatch()` on-demand si falta cache fresco, sirve `metrics2/index` y `metrics2/show` vía Inertia). Redes por cliente están en `Client::metricool_networks` (columna json array, default `['facebook','instagram']` si es null — ver `Metrics2Controller::DEFAULT_NETWORKS`).
- Frontend actual: `resources/js/pages/metrics2/index.tsx` y `resources/js/pages/metrics2/show.tsx`. Este último tipa el resultado scrapeado como `Record<string, string | null>` (sin tipado fuerte) — o sea hoy el frontend consume el JSON crudo tal cual, sin normalizar.
- **No hay ninguna corrida automática/mensual para metrics2** — todo se dispara on-demand al entrar a la pantalla del cliente. Tampoco hay librería de gráficos instalada en el proyecto (`package.json` no tiene `recharts` ni similar); habría que agregar una.
- **Cambios estéticos posteriores aplicados a `show.tsx`** (ver `cambios-metrics2.diff`, ya mergeado): `NETWORK_META` ganó `accent`/`solid` (borde superior de 4px con el color -500 de cada red en las `NetworkCard`), se agregó un resumen ejecutivo (`HeroSummary`/`HeroCard`: mejor/peor performer, inversión total, conversiones totales) arriba de las cards, los badges "cache"/"en vivo" pasaron de pill coloreado a texto discreto (`text-[10px] text-muted-foreground/60`), y las métricas de costo (CPC/CPM) invierten el color semántico del delta (bajar = verde/bueno) vía el nuevo parámetro `invert` de `deltaColor()`.

### Decisiones ya tomadas con el usuario (no volver a preguntar)
- Alcance: **solo metrics2** (no tocar el pipeline v1 de `metrics`).
- Los valores no parseables deben degradar a "N/D" (`value = null`) sin romper tablas ni gráficos — nunca lanzar excepción no capturada ni omitir la fila/celda.
- Backend: **un solo lugar** (una tabla) donde se guardan los snapshots mensuales comparables de metrics2.
- Frontend: **tres vistas** (ampliado durante la sesión, ver "Actualizaciones posteriores al plan original" más abajo):
  1. Evolución año a año por cliente.
  2. Comparativa general con todos los clientes de Ninjas (una métrica, todos los clientes).
  3. Comparación de todas las métricas para 2-3 clientes elegidos, con la posibilidad de ocultar redes sociales sin datos (ícono de ojo / ojo tachado).

## Contexto

Hoy `metrics2` scrapea (Selenium/Panther) el dashboard de Metricool para redes que la API oficial no cubre bien (TikTok, YouTube, Meta Ads, y Facebook/Instagram como respaldo). Pero:

- Se dispara **on-demand** al entrar a la pantalla de un cliente, no corre solo.
- Guarda un JSON crudo por `(client, network, rango de fechas)` en `metricool_scrape_cache`, con **valores como texto tal cual aparecen en el DOM** ("1.2K", "+3.4%"), sin normalizar.
- No hay ningún lugar donde queden datos **comparables mes a mes** ni **entre clientes** — cada scrape es un blob suelto atado a un rango arbitrario.

Esto ya existe y funciona para `metrics` (v1, vía API): una tabla `monthly_snapshots` (client_id, year, month, area, metric_key, value numérico) alimentada por una corrida mensual automática, con vista de evolución mes a mes por cliente. Ese patrón es el que vamos a replicar para `metrics2`, pero como pipeline separado (fuente de datos distinta, menos confiable, necesita manejo explícito de N/D) y **sin tocar `metrics` v1**.

Objetivo: una corrida mensual automática por cliente/red que deja datos normalizados y comparables, para poder armar (a) la evolución año a año de un cliente (ej. seguidores IG mes a mes), (b) un comparativo entre todos los clientes de Ninjas para la misma métrica/mes, y (c) una comparación lado a lado de todas las métricas para 2-3 clientes puntuales.

## Backend

### 1. Tabla nueva: `metricool_monthly_snapshots`

Un solo lugar canónico para los snapshots normalizados de metrics2 (separado de `monthly_snapshots` de v1 para no mezclar fuentes ni namespaces de `metric_key`).

Migración `database/migrations/..._create_metricool_monthly_snapshots_table.php`:
- `client_id` (FK, cascadeOnDelete)
- `network` (string 32: facebook/instagram/tiktok/youtube/googleAds/metaAds)
- `year` (unsignedSmallInteger), `month` (unsignedTinyInteger)
- `metric_key` (string 60, ej. `followers_total`, `followers_gained`, `followers_lost`, `views_total`, `spend_total`)
- `value` (decimal 18,4, **nullable** — null = N/D)
- `status` (string 10: `ok` / `nd` / `error`)
- `meta` (json nullable — guarda el string crudo original y, si aplica, el mensaje de error, para poder auditar qué se leyó)
- `scraped_at` (timestamp nullable)
- timestamps
- Unique: `(client_id, network, year, month, metric_key)`
- Index: `(client_id, year, month)` y `(network, metric_key, year, month)` (para las consultas comparativas entre clientes)

Modelo `App\Models\MetricoolMonthlySnapshot` (mismo estilo que `app/Models/MonthlySnapshot.php`): fillable, casts (`value` decimal, `meta` array, fechas), relación `client()`.

### 2. Normalizador de valores

Nueva clase `App\Services\Metricool\ScrapeValueNormalizer`:
- `parseNumber(?string $raw): ?float` — parsea "1.2K", "3,4 mil", "$1.234,56", "12,3%", "N/A", "-", vacío → `float` o `null` si no se puede interpretar (nunca lanza excepción).
- Reutilizable por los 6 métodos `do*Evolution` existentes en `MetricoolScraperService` (hoy dejan todo como string).

### 3. Mapeo raw → snapshot

Nueva clase `App\Services\Metricool\ScrapeSnapshotBuilder::build(string $network, array $rawData): array`, misma idea que `KpiCalculator` de v1: por red, define qué claves del `data` crudo (el output actual de `doFacebookEvolution`, `doInstagramEvolution`, etc.) se traducen a qué `metric_key` comparable, ignorando las claves de debug (`_raw`, `_delta_boxes`).

Ejemplo Instagram: `followers_total` → metric_key `followers_total` (valor total, comparable como serie acumulada), `followers_gained`/`followers_daily` → `followers_gained` (variación del mes). Si `$rawData['_error']` está seteado, o una clave puntual no parsea, esa fila sale con `value = null`, `status = 'nd'` (o `'error'` si fue toda la red la que falló) y el motivo en `meta`.

### 4. Job mensual

Nuevo `App\Jobs\ScrapeMetricoolMonthlySnapshot(clientId, network, year, month)`:
1. Resuelve `blogId`/`userId` del cliente.
2. Calcula `start`/`end` = inicio/fin de ese mes.
3. Llama a `MetricoolScraperService::scrapeEvolutions([$network => [...]], $start, $end)` — **reutiliza el scraper existente tal cual**, no se toca `metricool_scrape_cache` ni el flujo on-demand actual.
4. Normaliza con `ScrapeSnapshotBuilder` y hace `updateOrCreate` de cada fila en `metricool_monthly_snapshots`.
5. Si la red entera falla (excepción/timeout), igual deja una fila por cada `metric_key` esperado de esa red con `value=null, status='error'` — así nunca falta la celda en la tabla/gráfico, sale como "N/D" en vez de romper.

Nota: como el scraper fuerza el rango de fechas y Metricool calcula la evolución para ese rango con sus propios datos históricos, este job también sirve para **backfill de meses pasados** corriendo con `--year --month` viejos (dentro de lo que Metricool todavía tenga en su período de retención).

### 5. Comando + scheduler

Nuevo `metricool:scrape-monthly` (mismo patrón que `metricool:sync-staggered`):
- Opciones: `--client=`, `--year=`, `--month=`, `--previous-month`, `--delay=` (default 30s, más alto que el de v1 porque cada red implica una sesión Chrome completa).
- Itera clientes con `metricool_blog_id`, y para cada uno sus `metricool_networks` configuradas, corriendo un `ScrapeMetricoolMonthlySnapshot` por cliente+red con delay entre corridas (Chrome no soporta bien paralelismo).

En `routes/console.php`, agregar (corre una vez, el día 2 de cada mes, para cerrar el mes anterior — igual que ya hace `metricool:sync-staggered --previous-month`, pero corrido a otra hora para no competir por recursos):
```php
Schedule::command('metricool:scrape-monthly --previous-month --delay=30')
    ->monthlyOn(2, '06:30')
    ->withoutOverlapping()
    ->onOneServer();
```

### 6. Endpoints de lectura

En `Metrics2Controller` (o un nuevo `Metrics2ReportController` si se prefiere separar):
- `evolution(Client $client, Request $request)`: dado un `year`, devuelve por cada red/metric_key configurada del cliente una serie de 12 puntos (mes → `value|null`), para armar el gráfico de evolución + tabla de variación mes a mes.
- `comparative(Request $request)`: dado `network`, `metric`, `year` (o mes puntual), devuelve una fila por cliente con su serie/valor — para el comparativo general de Ninjas. Los `null` se devuelven tal cual (el frontend decide cómo mostrarlos), nunca se omite la fila/columna.
- `compareClients(Request $request)`: dado `client_ids[]` (2-3), `year`, `month`, devuelve todas las filas de `metricool_monthly_snapshots` de esos clientes para ese mes, agrupadas por red — para la vista de comparación multi-métrica. El frontend decide qué redes ocultar según cuáles vengan 100% en N/D para el combo de clientes elegido.

## Frontend

Tres vistas nuevas dentro de `resources/js/pages/metrics2/`:

1. **Evolución por cliente** (`metrics2/evolution.tsx`): selector de año + selector de métrica (ej. "Instagram — Seguidores totales"), gráfico de línea (eje X = meses, eje Y = valor) con huecos donde el valor es `null` (no se interpola, se corta la línea — así un N/D no "miente" con una interpolación falsa), tabla debajo con total y variación mes a mes, celdas `null` renderizadas como "N/D" en vez de 0 o vacío. Incluye un resumen tipo "hero cards" arriba del gráfico (total actual, variación del último mes, mejor mes, meses con dato) siguiendo el mismo patrón visual que `HeroCard`/`HeroSummary` de `show.tsx`.
2. **Comparativa Ninjas** (`metrics2/comparativa.tsx`): selector de red + métrica + mes/año, tabla con filas = clientes, columnas = meses (o una sola columna con barras horizontales si es "mes puntual"), mismo tratamiento de "N/D".
3. **Comparar clientes** (`metrics2/comparar-clientes.tsx`, nueva): elegir 2-3 clientes (chips removibles) + mes/año, tabla con filas = todas las métricas agrupadas por red (Instagram, Facebook, TikTok, YouTube, Ads) y columnas = los clientes elegidos. El mayor valor de cada fila se resalta (solo cuando hay ≥2 valores reales para comparar; en métricas de costo como CPC/CPM gana el valor más bajo, mismo criterio `invert` que ya usa `show.tsx`). **Cada grupo de red tiene un ícono de ojo / ojo tachado** (arriba en una barra de toggles y también inline en el header del grupo) para mostrar/ocultar esa red de la comparación — las redes donde ningún cliente seleccionado tiene datos ese mes arrancan ocultas automáticamente, pero el usuario puede volver a mostrarlas.

Como no hay librería de gráficos instalada, agregar **recharts** (estándar de facto con shadcn/ui, que ya usa este proyecto) y un wrapper simple de línea reutilizable entre las vistas que lo necesiten.

Reutilizar componentes existentes de `resources/js/components/ui` (tablas, selects, `Card`) y el layout ya usado en `metrics2/show.tsx` / `metrics2/index.tsx`, incluyendo los patrones ya establecidos ahí: `SectionHeader` para dividir grupos dentro de una tabla/card, `NETWORK_META` (badge + accent) para identificar redes, y `deltaColor(..., invert)` para el criterio de costo invertido.

Mockups de referencia (HTML navegable, calcado del sistema visual real vía tokens de `resources/css/app.css`) armados durante la sesión de planificación: tres pestañas — Evolución, Comparativa Ninjas, Comparar clientes — con datos de ejemplo y la interacción de mostrar/ocultar redes ya funcional en JS puro, para copiar el layout 1:1 al implementar los `.tsx` reales.

## Verificación

- `php artisan migrate` corre limpio, tabla nueva creada.
- `php artisan metricool:scrape-monthly --client=<id> --previous-month --delay=0` (sync, un solo cliente) deja filas en `metricool_monthly_snapshots` con valores numéricos razonables para al menos Instagram/Facebook.
- Forzar un caso de error (blog_id inválido o red no soportada) y confirmar que igual se escribe la fila con `status='error'`/`value=null`, sin excepción no capturada.
- Cargar `metrics2/evolution` para un cliente con al menos 2-3 meses de datos: el gráfico se corta (no interpola) en los meses N/D, la tabla muestra "N/D" sin romper el layout.
- Cargar `metrics2/comparativa` con varios clientes, alguno sin dato para un mes dado: la fila/columna se ve como "N/D", no rompe el render.
- Cargar `metrics2/comparar-clientes` con 2-3 clientes donde al menos uno no tenga alguna red configurada: esa red se oculta sola, el toggle de ojo la vuelve a mostrar, y el resaltado de "mayor valor" no se dispara cuando solo hay un valor real en la fila.
- Confirmar en `routes/console.php` (`php artisan schedule:list`) que la nueva entrada mensual aparece correctamente agendada.
