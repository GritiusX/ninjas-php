import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Loader2, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MetricoolReportsButton } from '@/components/metricool-reports-button';
import { ScrapingOverlay } from '@/components/scraping-overlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type NetworkData = Record<string, string | null>;

type NetworkResult = {
    data: NetworkData | null;
    fromCache: boolean;
    error: string | null;
    pending: boolean;
    rangeStart: string | null;
    rangeEnd: string | null;
};

type Props = {
    client: { id: number; name: string };
    networkResults: Record<string, NetworkResult>;
    start: string;
    end: string;
    isDefault: boolean;
};

const NETWORK_META: Record<string, { label: string; badge: string; badgeClass: string }> = {
    facebook:  { label: 'Facebook · Evolución',    badge: 'FB', badgeClass: 'bg-blue-100 text-blue-700' },
    instagram: { label: 'Instagram · Evolución',   badge: 'IG', badgeClass: 'bg-pink-100 text-pink-700' },
    tiktok:    { label: 'TikTok · Evolución',      badge: 'TT', badgeClass: 'bg-purple-100 text-purple-700' },
    youtube:   { label: 'YouTube · Evolución',     badge: 'YT', badgeClass: 'bg-red-100 text-red-700' },
    googleAds: { label: 'Google Ads · Evolución',  badge: 'GA', badgeClass: 'bg-green-100 text-green-700' },
    metaAds:   { label: 'Meta Ads · Evolución',    badge: 'MA', badgeClass: 'bg-indigo-100 text-indigo-700' },
};

function formatDate(iso: string) {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso + 'T00:00:00'));
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div className="flex justify-between border-b py-2 text-sm last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className={value ? 'font-semibold text-foreground' : 'text-muted-foreground/40 italic'}>
                {value ?? '—'}
            </span>
        </div>
    );
}

function SectionHeader({ label }: { label: string }) {
    return <p className="bg-muted -mx-1 mb-1 mt-3 rounded px-1 py-1 text-xs font-semibold text-muted-foreground first:mt-0">{label}</p>;
}

// Metricool reporta el % de cambio como string con coma decimal (ej "-10,49%").
function parseSignedNumber(raw: string | null | undefined): number | null {
    if (!raw) return null;
    const n = parseFloat(raw.replace('%', '').replace(',', '.').trim());
    return Number.isNaN(n) ? null : n;
}

// string en vez de 'up' | 'down' porque viene de NetworkData (Record<string, string | null>).
type Direction = string | null | undefined;

// Metricool ya pinta un ícono de flecha (fa-arrow-up/fa-arrow-down) directo en
// el DOM del value, sin depender de hover — es más confiable que el signo del
// % (que solo llega vía el tooltip, y a veces el hover no llega a tiempo). Por
// eso direction, cuando viene del scraper, tiene prioridad sobre el % parseado.
function deltaColor(pct: number | null, direction?: Direction): string {
    if (direction === 'up') return 'text-green-600';
    if (direction === 'down') return 'text-red-600';
    if (pct === null) return 'text-muted-foreground';
    if (pct > 1) return 'text-green-600';
    if (pct < -1) return 'text-red-600';
    return 'text-yellow-600';
}

function deltaIcon(pct: number | null, direction?: Direction) {
    if (direction === 'up') return TrendingUp;
    if (direction === 'down') return TrendingDown;
    if (pct === null) return Minus;
    if (pct > 1) return TrendingUp;
    if (pct < -1) return TrendingDown;
    return Minus;
}

// Igual que DataRow pero además muestra la flecha (sube/baja/estable) y el %
// de cambio vs. el período de comparación, tal como lo muestra el hover de
// Metricool — así "88" y "-88" no se ven idénticos en la card.
function DataRowWithDelta({
    label,
    value,
    delta,
    deltaPct,
    direction,
}: {
    label: string;
    value: string | null | undefined;
    delta?: string | null;
    deltaPct?: string | null;
    direction?: Direction;
}) {
    const pct = parseSignedNumber(deltaPct);
    const DeltaIcon = deltaIcon(pct, direction);
    const hasDelta = Boolean(delta || deltaPct || direction);

    return (
        <div className="flex items-center justify-between border-b py-2 text-sm last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="flex items-center gap-1.5">
                <span className={value ? 'font-semibold text-foreground' : 'text-muted-foreground/40 italic'}>
                    {value ?? '—'}
                </span>
                {hasDelta && (
                    <span
                        className={`flex items-center gap-0.5 text-xs ${deltaColor(pct, direction)}`}
                        title={delta && deltaPct ? `${delta} (${deltaPct})` : (deltaPct ?? delta ?? undefined)}
                    >
                        <DeltaIcon className="h-3 w-3" />
                        {deltaPct ?? delta}
                    </span>
                )}
            </span>
        </div>
    );
}

function FacebookSection({ data }: { data: NetworkData }) {
    return (
        <>
            <DataRowWithDelta label="Crecimiento de seguidores" value={data.followers_growth} delta={data.followers_growth_delta} deltaPct={data.followers_growth_delta_pct} direction={data.followers_growth_direction} />
            <DataRowWithDelta label="Visualizaciones" value={data.views} delta={data.views_delta} deltaPct={data.views_delta_pct} direction={data.views_direction} />
        </>
    );
}

function InstagramSection({ data, start, end }: { data: NetworkData; start: string; end: string }) {
    return (
        <>
            <SectionHeader label="Totales acumulados" />
            <DataRowWithDelta label="Seguidores (total)" value={data.followers_total} delta={data.followers_total_delta} deltaPct={data.followers_total_delta_pct} direction={data.followers_total_direction} />
            <DataRowWithDelta label="Siguiendo (total)" value={data.following_total} delta={data.following_total_delta} deltaPct={data.following_total_delta_pct} direction={data.following_total_direction} />
            <DataRowWithDelta label="Contenido total" value={data.content_total} delta={data.content_total_delta} deltaPct={data.content_total_delta_pct} direction={data.content_total_direction} />

            <SectionHeader label={`Período (${formatDate(start)} – ${formatDate(end)})`} />
            <DataRow label="Seguidores ganados" value={data.followers_gained} />
            <DataRow label="Seguidores diarios" value={data.followers_daily} />
            <DataRow label="Seguidores por publicación" value={data.followers_per_post} />
            <DataRow label="Siguiendo (delta)" value={data.following_net} />
            <DataRow label="Publicaciones por día" value={data.posts_per_day} />
            <DataRow label="Publicaciones por semana" value={data.posts_per_week} />
        </>
    );
}

function TiktokSection({ data }: { data: NetworkData }) {
    return (
        <>
            <SectionHeader label="Crecimiento" />
            <DataRowWithDelta label="Seguidores" value={data.followers} delta={data.followers_delta} deltaPct={data.followers_delta_pct} direction={data.followers_direction} />
            <DataRowWithDelta label="Posts" value={data.posts} delta={data.posts_delta} deltaPct={data.posts_delta_pct} direction={data.posts_direction} />
            <SectionHeader label="Balance de seguidores" />
            <DataRowWithDelta label="Adquiridos" value={data.followers_gained} delta={data.followers_gained_delta} deltaPct={data.followers_gained_delta_pct} direction={data.followers_gained_direction} />
            <DataRowWithDelta label="Perdidos" value={data.followers_lost} delta={data.followers_lost_delta} deltaPct={data.followers_lost_delta_pct} direction={data.followers_lost_direction} />
        </>
    );
}

function YoutubeSection({ data }: { data: NetworkData }) {
    return (
        <>
            <SectionHeader label="Crecimiento" />
            <DataRowWithDelta label="Suscriptores" value={data.subscribers} delta={data.subscribers_delta} deltaPct={data.subscribers_delta_pct} direction={data.subscribers_direction} />
            <DataRowWithDelta label="Reproducciones" value={data.views} delta={data.views_delta} deltaPct={data.views_delta_pct} direction={data.views_direction} />
            <DataRowWithDelta label="Revenue" value={data.revenue} delta={data.revenue_delta} deltaPct={data.revenue_delta_pct} direction={data.revenue_direction} />
            <DataRowWithDelta label="Videos" value={data.videos} delta={data.videos_delta} deltaPct={data.videos_delta_pct} direction={data.videos_direction} />
            <SectionHeader label="Balance de suscriptores" />
            <DataRowWithDelta label="Ganados" value={data.subscribers_gained} delta={data.subscribers_gained_delta} deltaPct={data.subscribers_gained_delta_pct} direction={data.subscribers_gained_direction} />
            <DataRowWithDelta label="Perdidos" value={data.subscribers_lost} delta={data.subscribers_lost_delta} deltaPct={data.subscribers_lost_delta_pct} direction={data.subscribers_lost_direction} />
        </>
    );
}

function AdsSection({ data }: { data: NetworkData }) {
    return (
        <>
            <SectionHeader label="Alcance" />
            <DataRowWithDelta label="Impresiones" value={data.impressions} delta={data.impressions_delta} deltaPct={data.impressions_delta_pct} direction={data.impressions_direction} />
            <DataRowWithDelta label="Gasto" value={data.spend} delta={data.spend_delta} deltaPct={data.spend_delta_pct} direction={data.spend_direction} />
            <SectionHeader label="Resultados" />
            <DataRowWithDelta label="Clics" value={data.clicks} delta={data.clicks_delta} deltaPct={data.clicks_delta_pct} direction={data.clicks_direction} />
            <DataRowWithDelta label="Conversiones" value={data.conversions} delta={data.conversions_delta} deltaPct={data.conversions_delta_pct} direction={data.conversions_direction} />
            <SectionHeader label="Rendimiento" />
            <DataRowWithDelta label="CPM" value={data.cpm} delta={data.cpm_delta} deltaPct={data.cpm_delta_pct} direction={data.cpm_direction} />
            <DataRowWithDelta label="CPC" value={data.cpc} delta={data.cpc_delta} deltaPct={data.cpc_delta_pct} direction={data.cpc_direction} />
            <DataRowWithDelta label="CTR" value={data.ctr} delta={data.ctr_delta} deltaPct={data.ctr_delta_pct} direction={data.ctr_direction} />
        </>
    );
}

function GenericSection({ data }: { data: NetworkData }) {
    const entries = Object.entries(data).filter(([k]) => !k.startsWith('_'));
    return (
        <>
            {entries.map(([key, value]) => (
                <DataRow key={key} label={key} value={value} />
            ))}
        </>
    );
}

function NetworkCard({
    network,
    result,
    start,
    end,
}: {
    network: string;
    result: NetworkResult;
    start: string;
    end: string;
}) {
    const meta = NETWORK_META[network] ?? {
        label: network,
        badge: network.slice(0, 2).toUpperCase(),
        badgeClass: 'bg-gray-100 text-gray-600',
    };

    // El rango real de la fila cacheada (rangeStart/rangeEnd) puede ser
    // distinto del rango de la página si vino del fallback "cualquier scrape
    // reciente" (ver Metrics2Controller::findFreshCache) — usamos ese en vez
    // del de la página para no etiquetar mal el período mostrado.
    const periodStart = result.rangeStart ?? start;
    const periodEnd = result.rangeEnd ?? end;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${meta.badgeClass}`}>
                        {meta.badge}
                    </span>
                    {meta.label}
                    {result.fromCache && (
                        <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            cache
                        </span>
                    )}
                    {!result.fromCache && result.data && (
                        <span className="ml-auto rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            en vivo
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {result.pending ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scrapeando...
                    </div>
                ) : result.error ? (
                    <p className="rounded bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">{result.error}</p>
                ) : result.data ? (
                    network === 'facebook' ? (
                        <FacebookSection data={result.data} />
                    ) : network === 'instagram' ? (
                        <InstagramSection data={result.data} start={periodStart} end={periodEnd} />
                    ) : network === 'tiktok' ? (
                        <TiktokSection data={result.data} />
                    ) : network === 'youtube' ? (
                        <YoutubeSection data={result.data} />
                    ) : network === 'googleAds' || network === 'metaAds' ? (
                        <AdsSection data={result.data} />
                    ) : (
                        <GenericSection data={result.data} />
                    )
                ) : (
                    <p className="text-muted-foreground text-sm">Sin datos</p>
                )}
            </CardContent>
        </Card>
    );
}

export default function Metrics2Show({ client, networkResults: initialResults, start, end, isDefault }: Props) {
    const [networkResults, setNetworkResults] = useState(initialResults);
    const [navigating, setNavigating] = useState(false);
    const [pollError, setPollError] = useState<string | null>(null);
    const [desde, setDesde] = useState(start);
    const [hasta, setHasta] = useState(end);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const failCountRef = useRef(0);

    const allResults = Object.values(networkResults);
    const totalNetworks = allResults.length;
    const completedNetworks = allResults.filter((r) => !r.pending).length;
    const hasPending = completedNetworks < totalNetworks;
    const showOverlay = hasPending || navigating || pollError !== null;
    const progress = navigating || totalNetworks === 0 ? undefined : (completedNetworks / totalNetworks) * 100;

    const rangeChanged = desde !== start || hasta !== end;
    // Vacío en ambos también es válido: significa "sin fechas" (automático) —
    // el usuario tiene que tocar "Aplicar rango" para que eso se haga efectivo.
    const rangeValid = (desde === '' && hasta === '') || (desde !== '' && hasta !== '' && desde <= hasta);

    // Sync cuando Inertia actualiza las props (ej: después de force refresh)
    useEffect(() => {
        setNetworkResults(initialResults);
    }, [initialResults]);

    // Sync los inputs de fecha cuando cambia el rango resuelto por el server
    // (aplicar rango, volver al automático, o navegación directa con query params)
    useEffect(() => {
        setDesde(start);
        setHasta(end);
    }, [start, end]);

    // Polling: cada 3 segundos mientras haya redes pendientes
    useEffect(() => {
        if (!hasPending) {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            return;
        }

        failCountRef.current = 0;

        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/metrics2/${client.id}/status?start=${start}&end=${end}`);
                if (!res.ok) throw new Error(`Error ${res.status}`);
                const json = await res.json() as { networkResults: Record<string, NetworkResult> };
                failCountRef.current = 0;
                setNetworkResults(json.networkResults);
            } catch (e) {
                failCountRef.current += 1;
                if (failCountRef.current >= 3) {
                    clearInterval(pollRef.current!);
                    pollRef.current = null;
                    setPollError(e instanceof Error ? e.message : 'Error de conexión con el servidor');
                }
            }
        }, 3000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [hasPending]);

    async function handleCancel() {
        try {
            await fetch('/metrics2/cancel', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
            });
        } catch {
            // ignorar error, navegar igual
        }
        router.get('/metrics2');
    }

    function handleRefresh() {
        setPollError(null);
        setNavigating(true);
        router.get(`/metrics2/${client.id}`, { start, end, force: '1' }, {
            onFinish: () => setNavigating(false),
        });
    }

    function handleApplyRange() {
        if (!rangeValid || !rangeChanged) return;
        setNavigating(true);
        const params = desde === '' && hasta === '' ? {} : { start: desde, end: hasta };
        router.get(`/metrics2/${client.id}`, params, {
            onFinish: () => setNavigating(false),
        });
    }

    // Solo limpia los inputs de fecha — no navega ni dispara nada. Si el
    // usuario quiere quedarse sin fechas (automático), tiene que confirmarlo
    // tocando "Aplicar rango" a continuación.
    function handleClearDates() {
        setDesde('');
        setHasta('');
    }

    return (
        <>
            <Head title={`${client.name} — Scraper Metricool`} />
            <ScrapingOverlay visible={showOverlay} error={pollError} progress={progress} onRetry={pollError ? handleRefresh : undefined} onCancel={!pollError && !navigating ? handleCancel : undefined} />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/metrics2" className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold">{client.name}</h1>
                            <p className="text-muted-foreground text-sm">
                                {formatDate(start)} — {formatDate(end)}
                                {isDefault && <span className="ml-1">(automático — Metricool decide el período real por red)</span>}
                            </p>
                            <p className="text-muted-foreground/70 mt-1 max-w-md text-xs leading-snug">
                                Si hay caché de los últimos 30 días se muestra directo; si no, se dispara un scrape solo.
                                Usá "Actualizar" para forzar una recarga aunque ya haya caché.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={navigating || hasPending}>
                            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${navigating ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                        <MetricoolReportsButton clientId={client.id} period={end.slice(0, 7)} />
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="desde" className="text-xs">Desde</Label>
                        <Input
                            id="desde"
                            type="date"
                            value={desde}
                            max={hasta}
                            onChange={(e) => setDesde(e.target.value)}
                            className="w-40"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="hasta" className="text-xs">Hasta</Label>
                        <Input
                            id="hasta"
                            type="date"
                            value={hasta}
                            min={desde}
                            onChange={(e) => setHasta(e.target.value)}
                            className="w-40"
                        />
                    </div>
                    <Button size="sm" onClick={handleApplyRange} disabled={!rangeValid || !rangeChanged || navigating}>
                        Aplicar rango
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClearDates}
                        disabled={navigating || (desde === '' && hasta === '')}
                    >
                        Limpiar fechas
                    </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    {Object.entries(networkResults).map(([network, result]) => (
                        <NetworkCard
                            key={network}
                            network={network}
                            result={result}
                            start={start}
                            end={end}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

Metrics2Show.layout = {
    breadcrumbs: [
        { title: 'Scraper Metricool', href: '/metrics2' },
        { title: 'Cliente', href: '#' },
    ],
};
