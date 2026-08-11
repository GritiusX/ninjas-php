import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Loader2, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { MetricoolReportsButton } from '@/components/metricool-reports-button';
import { ScrapingOverlay } from '@/components/scraping-overlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EvolutionDialog, type EvolutionSeries } from '@/components/metrics/evolution-dialog';
import { Sparkline, type SparklinePoint } from '@/components/metrics/sparkline';

type NetworkData = Record<string, string | null>;

type NetworkResult = {
    data: NetworkData | null;
    fromCache: boolean;
    error: string | null;
    pending: boolean;
    rangeStart: string | null;
    rangeEnd: string | null;
};

type HistoryPoint = { date: string; data: NetworkData };

type Props = {
    client: { id: number; name: string };
    networkResults: Record<string, NetworkResult>;
    start: string;
    end: string;
    isDefault: boolean;
    history: Record<string, HistoryPoint[]>;
};

type NetworkVisual = {
    label: string;
    badge: string;
    badgeStyle: CSSProperties;
    accentStyle: CSSProperties;
    brandColor: string;
};

const NETWORK_META: Record<string, NetworkVisual> = {
    facebook: {
        label: 'Facebook · Evolución',
        badge: 'FB',
        badgeStyle: { backgroundColor: '#1877F2', color: '#fff' },
        accentStyle: { borderTopColor: '#1877F2' },
        brandColor: '#1877F2',
    },
    instagram: {
        label: 'Instagram · Evolución',
        badge: 'IG',
        badgeStyle: { background: 'linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)', color: '#fff' },
        accentStyle: { borderImage: 'linear-gradient(90deg, #F58529, #DD2A7B, #8134AF) 1' },
        brandColor: '#DD2A7B',
    },
    tiktok: {
        label: 'TikTok · Evolución',
        badge: 'TT',
        badgeStyle: { background: 'linear-gradient(135deg, #25F4EE, #FE2C55)', color: '#fff' },
        accentStyle: { borderTopColor: '#FE2C55' },
        brandColor: '#FE2C55',
    },
    youtube: {
        label: 'YouTube · Evolución',
        badge: 'YT',
        badgeStyle: { backgroundColor: '#FF0000', color: '#fff' },
        accentStyle: { borderTopColor: '#FF0000' },
        brandColor: '#FF0000',
    },
    googleAds: {
        label: 'Google Ads · Evolución',
        badge: 'GA',
        badgeStyle: { background: 'conic-gradient(#4285F4, #FBBC05, #34A853, #EA4335)', color: '#1B1F27' },
        accentStyle: { borderTopColor: '#4285F4' },
        brandColor: '#4285F4',
    },
    metaAds: {
        label: 'Meta Ads · Evolución',
        badge: 'MA',
        badgeStyle: { backgroundColor: '#0866FF', color: '#fff' },
        accentStyle: { borderTopColor: '#0866FF' },
        brandColor: '#0866FF',
    },
};

function fallbackMeta(network: string): NetworkVisual {
    return {
        label: network,
        badge: network.slice(0, 2).toUpperCase(),
        badgeStyle: { backgroundColor: '#9CA3AF', color: '#fff' },
        accentStyle: { borderTopColor: '#9CA3AF' },
        brandColor: '#9CA3AF',
    };
}

// Redes cuyo "primer" indicador de desempeño se usa para el resumen ejecutivo
// (tarjetas de mejor/peor performer). Para redes orgánicas es el crecimiento
// de seguidores; para pauta, las conversiones — son las métricas que un
// cliente asocia primero con "funcionó / no funcionó".
const PRIMARY_METRIC: Record<string, { field: string; label: string }> = {
    facebook:  { field: 'followers_growth', label: 'Crecimiento de seguidores' },
    instagram: { field: 'followers_total',  label: 'Seguidores totales' },
    tiktok:    { field: 'followers',        label: 'Seguidores' },
    youtube:   { field: 'subscribers',      label: 'Suscriptores' },
    googleAds: { field: 'conversions',      label: 'Conversiones' },
    metaAds:   { field: 'conversions',      label: 'Conversiones' },
};

const ADS_NETWORKS = ['googleAds', 'metaAds'];

// Metricool muestra los números en formato es-AR: '.' agrupa miles, ',' es el
// separador decimal (ej. "2.957,80", "4.161", "308,03k"). A veces abrevia con
// sufijo k/M (miles/millones) — hay que aplicar el multiplicador o un total
// como "Inversión total" queda mil veces más chico de lo real.
function parseLooseNumber(raw: string | null | undefined): number | null {
    if (!raw) {
        return null;
    }

    const suffixMatch = raw.trim().match(/([kKmM])\s*$/);
    const multiplier = suffixMatch ? (suffixMatch[1].toLowerCase() === 'k' ? 1_000 : 1_000_000) : 1;

    const cleaned = raw.replace(/[^0-9,-]/g, '').replace(',', '.');

    if (!cleaned) {
        return null;
    }

    const n = parseFloat(cleaned);

    return Number.isNaN(n) ? null : n * multiplier;
}

function extractCurrencySymbol(raw: string | null | undefined): string {
    return raw?.match(/^[^0-9-]*/)?.[0]?.trim() ?? '';
}

// Serie numérica para sparklines/drill-down a partir del historial diario de
// una red. Se filtran los días sin ese campo o con error de scrape — no
// interpolamos ni inventamos puntos.
function seriesForField(history: HistoryPoint[], field: string): SparklinePoint[] {
    const points: SparklinePoint[] = [];
    for (const point of history) {
        if (point.data._error) {
            continue;
        }
        const value = parseLooseNumber(point.data[field]);
        if (value === null) {
            continue;
        }
        points.push({ date: point.date, value });
    }
    return points;
}

// Suma varias series por fecha (ej. gasto de Google Ads + Meta Ads) para el
// mini-sparkline de una hero card combinada. El drill-down, en cambio, muestra
// las series por separado — sumarlas ahí sería engañoso.
function sumSeriesByDate(seriesList: SparklinePoint[][]): SparklinePoint[] {
    const byDate = new Map<string, number>();
    for (const series of seriesList) {
        for (const { date, value } of series) {
            byDate.set(date, (byDate.get(date) ?? 0) + value);
        }
    }
    return Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));
}

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
// invert = true para métricas donde bajar es la mejora (CPC, CPM, costo por
// resultado): el ícono sigue mostrando la dirección real (sube/baja), pero el
// color semántico (verde=bueno, rojo=malo) se invierte.
function deltaColor(pct: number | null, direction?: Direction, invert = false): string {
    const upColor = invert ? 'text-red-600' : 'text-green-600';
    const downColor = invert ? 'text-green-600' : 'text-red-600';

    if (direction === 'up') return upColor;
    if (direction === 'down') return downColor;
    if (pct === null) return 'text-muted-foreground';
    if (pct > 1) return upColor;
    if (pct < -1) return downColor;
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

// Igual que DataRow pero además muestra la flecha (sube/baja/estable), el %
// de cambio vs. el período de comparación, y opcionalmente un sparkline de 30
// días — clickeable para abrir el drill-down de evolución diaria.
function DataRowWithDelta({
    label,
    value,
    delta,
    deltaPct,
    direction,
    invert,
    spark,
    sparkColor,
    onClick,
}: {
    label: string;
    value: string | null | undefined;
    delta?: string | null;
    deltaPct?: string | null;
    direction?: Direction;
    invert?: boolean;
    spark?: SparklinePoint[];
    sparkColor?: string;
    onClick?: () => void;
}) {
    const pct = parseSignedNumber(deltaPct);
    const DeltaIcon = deltaIcon(pct, direction);
    const hasDelta = Boolean(delta || deltaPct || direction);
    const clickable = Boolean(onClick);

    return (
        <div
            className={`-mx-1 flex items-center justify-between gap-3 rounded border-b px-1 py-2 text-sm last:border-0 ${clickable ? 'cursor-pointer hover:bg-muted/50' : ''}`}
            onClick={onClick}
        >
            <span className="text-muted-foreground">{label}</span>
            <span className="flex items-center gap-2">
                {spark && spark.length >= 2 && <Sparkline points={spark} color={sparkColor ?? '#9CA3AF'} />}
                <span className={value ? 'font-semibold text-foreground' : 'text-muted-foreground/40 italic'}>
                    {value ?? '—'}
                </span>
                {hasDelta && (
                    <span
                        className={`flex items-center gap-0.5 text-xs ${deltaColor(pct, direction, invert)}`}
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

// Contexto que cada NetworkCard arma para sus Section — evita repetir
// history/brandColor/onDrillDown en cada fila individualmente.
type SectionCtx = {
    history: HistoryPoint[];
    brandColor: string;
    onDrillDown: (field: string, label: string) => void;
};

function FacebookSection({ data, ctx }: { data: NetworkData; ctx: SectionCtx }) {
    return (
        <>
            <SectionHeader label="Alcance" />
            <DataRowWithDelta
                label="Crecimiento de seguidores"
                value={data.followers_growth}
                delta={data.followers_growth_delta}
                deltaPct={data.followers_growth_delta_pct}
                direction={data.followers_growth_direction}
                spark={seriesForField(ctx.history, 'followers_growth')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('followers_growth', 'Crecimiento de seguidores')}
            />
            <SectionHeader label="Resultado" />
            <DataRowWithDelta
                label="Visualizaciones"
                value={data.views}
                delta={data.views_delta}
                deltaPct={data.views_delta_pct}
                direction={data.views_direction}
                spark={seriesForField(ctx.history, 'views')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('views', 'Visualizaciones')}
            />
        </>
    );
}

function InstagramSection({ data, start, end, ctx }: { data: NetworkData; start: string; end: string; ctx: SectionCtx }) {
    return (
        <>
            <SectionHeader label="Totales acumulados" />
            <DataRowWithDelta
                label="Seguidores (total)"
                value={data.followers_total}
                delta={data.followers_total_delta}
                deltaPct={data.followers_total_delta_pct}
                direction={data.followers_total_direction}
                spark={seriesForField(ctx.history, 'followers_total')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('followers_total', 'Seguidores (total)')}
            />
            <DataRowWithDelta
                label="Siguiendo (total)"
                value={data.following_total}
                delta={data.following_total_delta}
                deltaPct={data.following_total_delta_pct}
                direction={data.following_total_direction}
                spark={seriesForField(ctx.history, 'following_total')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('following_total', 'Siguiendo (total)')}
            />
            <DataRowWithDelta
                label="Contenido total"
                value={data.content_total}
                delta={data.content_total_delta}
                deltaPct={data.content_total_delta_pct}
                direction={data.content_total_direction}
                spark={seriesForField(ctx.history, 'content_total')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('content_total', 'Contenido total')}
            />

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

function TiktokSection({ data, ctx }: { data: NetworkData; ctx: SectionCtx }) {
    return (
        <>
            <SectionHeader label="Crecimiento" />
            <DataRowWithDelta
                label="Seguidores"
                value={data.followers}
                delta={data.followers_delta}
                deltaPct={data.followers_delta_pct}
                direction={data.followers_direction}
                spark={seriesForField(ctx.history, 'followers')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('followers', 'Seguidores')}
            />
            <DataRowWithDelta
                label="Posts"
                value={data.posts}
                delta={data.posts_delta}
                deltaPct={data.posts_delta_pct}
                direction={data.posts_direction}
                spark={seriesForField(ctx.history, 'posts')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('posts', 'Posts')}
            />
            <SectionHeader label="Balance de seguidores" />
            <DataRowWithDelta
                label="Adquiridos"
                value={data.followers_gained}
                delta={data.followers_gained_delta}
                deltaPct={data.followers_gained_delta_pct}
                direction={data.followers_gained_direction}
                spark={seriesForField(ctx.history, 'followers_gained')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('followers_gained', 'Adquiridos')}
            />
            <DataRowWithDelta
                label="Perdidos"
                value={data.followers_lost}
                delta={data.followers_lost_delta}
                deltaPct={data.followers_lost_delta_pct}
                direction={data.followers_lost_direction}
                invert
                spark={seriesForField(ctx.history, 'followers_lost')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('followers_lost', 'Perdidos')}
            />
        </>
    );
}

function YoutubeSection({ data, ctx }: { data: NetworkData; ctx: SectionCtx }) {
    return (
        <>
            <SectionHeader label="Crecimiento" />
            <DataRowWithDelta
                label="Suscriptores"
                value={data.subscribers}
                delta={data.subscribers_delta}
                deltaPct={data.subscribers_delta_pct}
                direction={data.subscribers_direction}
                spark={seriesForField(ctx.history, 'subscribers')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('subscribers', 'Suscriptores')}
            />
            <DataRowWithDelta
                label="Reproducciones"
                value={data.views}
                delta={data.views_delta}
                deltaPct={data.views_delta_pct}
                direction={data.views_direction}
                spark={seriesForField(ctx.history, 'views')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('views', 'Reproducciones')}
            />
            <DataRowWithDelta
                label="Revenue"
                value={data.revenue}
                delta={data.revenue_delta}
                deltaPct={data.revenue_delta_pct}
                direction={data.revenue_direction}
                spark={seriesForField(ctx.history, 'revenue')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('revenue', 'Revenue')}
            />
            <DataRowWithDelta
                label="Videos"
                value={data.videos}
                delta={data.videos_delta}
                deltaPct={data.videos_delta_pct}
                direction={data.videos_direction}
                spark={seriesForField(ctx.history, 'videos')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('videos', 'Videos')}
            />
            <SectionHeader label="Balance de suscriptores" />
            <DataRowWithDelta
                label="Ganados"
                value={data.subscribers_gained}
                delta={data.subscribers_gained_delta}
                deltaPct={data.subscribers_gained_delta_pct}
                direction={data.subscribers_gained_direction}
                spark={seriesForField(ctx.history, 'subscribers_gained')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('subscribers_gained', 'Ganados')}
            />
            <DataRowWithDelta
                label="Perdidos"
                value={data.subscribers_lost}
                delta={data.subscribers_lost_delta}
                deltaPct={data.subscribers_lost_delta_pct}
                direction={data.subscribers_lost_direction}
                invert
                spark={seriesForField(ctx.history, 'subscribers_lost')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('subscribers_lost', 'Perdidos')}
            />
        </>
    );
}

function AdsSection({ data, ctx }: { data: NetworkData; ctx: SectionCtx }) {
    return (
        <>
            <SectionHeader label="Alcance" />
            <DataRowWithDelta
                label="Impresiones"
                value={data.impressions}
                delta={data.impressions_delta}
                deltaPct={data.impressions_delta_pct}
                direction={data.impressions_direction}
                spark={seriesForField(ctx.history, 'impressions')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('impressions', 'Impresiones')}
            />
            <DataRowWithDelta
                label="Gasto"
                value={data.spend}
                delta={data.spend_delta}
                deltaPct={data.spend_delta_pct}
                direction={data.spend_direction}
                spark={seriesForField(ctx.history, 'spend')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('spend', 'Gasto')}
            />
            <SectionHeader label="Resultados" />
            <DataRowWithDelta
                label="Clics"
                value={data.clicks}
                delta={data.clicks_delta}
                deltaPct={data.clicks_delta_pct}
                direction={data.clicks_direction}
                spark={seriesForField(ctx.history, 'clicks')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('clicks', 'Clics')}
            />
            <DataRowWithDelta
                label="Conversiones"
                value={data.conversions}
                delta={data.conversions_delta}
                deltaPct={data.conversions_delta_pct}
                direction={data.conversions_direction}
                spark={seriesForField(ctx.history, 'conversions')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('conversions', 'Conversiones')}
            />
            <SectionHeader label="Eficiencia" />
            <DataRowWithDelta
                label="CPM"
                value={data.cpm}
                delta={data.cpm_delta}
                deltaPct={data.cpm_delta_pct}
                direction={data.cpm_direction}
                invert
                spark={seriesForField(ctx.history, 'cpm')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('cpm', 'CPM')}
            />
            <DataRowWithDelta
                label="CPC"
                value={data.cpc}
                delta={data.cpc_delta}
                deltaPct={data.cpc_delta_pct}
                direction={data.cpc_direction}
                invert
                spark={seriesForField(ctx.history, 'cpc')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('cpc', 'CPC')}
            />
            <DataRowWithDelta
                label="CTR"
                value={data.ctr}
                delta={data.ctr_delta}
                deltaPct={data.ctr_delta_pct}
                direction={data.ctr_direction}
                spark={seriesForField(ctx.history, 'ctr')}
                sparkColor={ctx.brandColor}
                onClick={() => ctx.onDrillDown('ctr', 'CTR')}
            />
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

type PerformerEntry = { network: string; label: string; pct: number };

type DrillDownPayload = { title: string; metricLabel: string; series: EvolutionSeries[] };

function HeroCard({
    title,
    network,
    value,
    valueLabel,
    pct,
    direction,
    spark,
    onClick,
}: {
    title: string;
    network?: string;
    value: string;
    valueLabel?: string;
    pct?: number | null;
    direction?: Direction;
    spark?: SparklinePoint[];
    onClick?: () => void;
}) {
    const meta = network ? (NETWORK_META[network] ?? null) : null;
    const hasTrend = pct !== undefined;
    const Icon = hasTrend ? deltaIcon(pct ?? null, direction) : null;
    const clickable = Boolean(onClick);

    return (
        <Card className={clickable ? 'cursor-pointer transition-colors hover:bg-muted/30' : undefined} onClick={onClick}>
            <CardContent className="flex flex-col gap-1.5 pt-4">
                <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-xs font-medium">{title}</p>
                    {meta && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={meta.badgeStyle}>
                            {meta.badge}
                        </span>
                    )}
                </div>
                <p className="text-2xl font-semibold">{value}</p>
                {valueLabel && <p className="text-muted-foreground text-xs">{valueLabel}</p>}
                <div className="flex items-center justify-between gap-2">
                    {hasTrend && Icon ? (
                        <span className={`flex items-center gap-0.5 text-xs ${deltaColor(pct ?? null, direction)}`}>
                            <Icon className="h-3 w-3" />
                            {pct !== null ? `${pct?.toFixed(1)}%` : direction}
                        </span>
                    ) : (
                        <span />
                    )}
                    {spark && spark.length >= 2 && <Sparkline points={spark} color={meta?.brandColor ?? '#9CA3AF'} width={70} height={26} />}
                </div>
            </CardContent>
        </Card>
    );
}

// Resumen ejecutivo: mejor/peor performer se calculan sobre la métrica
// "primaria" de cada red (ver PRIMARY_METRIC) — así comparamos manzanas con
// manzanas (todas son % de cambio) aunque las redes midan cosas distintas.
// Inversión y conversiones totales solo se agregan sobre redes de pauta
// (googleAds/metaAds), que son las que reportan gasto y conversiones.
function HeroSummary({
    networkResults,
    history,
    onDrillDown,
}: {
    networkResults: Record<string, NetworkResult>;
    history: Record<string, HistoryPoint[]>;
    onDrillDown: (payload: DrillDownPayload) => void;
}) {
    const performers: PerformerEntry[] = [];
    let totalSpend = 0;
    let spendSymbol = '';
    let hasSpend = false;
    let totalConversions = 0;
    let hasConversions = false;

    for (const [network, result] of Object.entries(networkResults)) {
        if (!result.data) {
            continue;
        }

        const primary = PRIMARY_METRIC[network];

        if (primary) {
            const pct = parseSignedNumber(result.data[`${primary.field}_delta_pct`]);

            if (pct !== null) {
                performers.push({ network, label: primary.label, pct });
            }
        }

        if (ADS_NETWORKS.includes(network)) {
            const spend = parseLooseNumber(result.data.spend);

            if (spend !== null) {
                totalSpend += spend;
                hasSpend = true;

                if (!spendSymbol) {
                    spendSymbol = extractCurrencySymbol(result.data.spend);
                }
            }

            const conversions = parseLooseNumber(result.data.conversions);

            if (conversions !== null) {
                totalConversions += conversions;
                hasConversions = true;
            }
        }
    }

    if (performers.length === 0 && !hasSpend && !hasConversions) {
        return null;
    }

    const best = performers.length > 0 ? performers.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
    const worst = performers.length > 1 ? performers.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;

    const performerSeries = (network: string): EvolutionSeries[] => {
        const meta = NETWORK_META[network] ?? fallbackMeta(network);
        const field = PRIMARY_METRIC[network]?.field ?? '';
        return [{ label: meta.label.split(' ·')[0], color: meta.brandColor, points: seriesForField(history[network] ?? [], field) }];
    };

    const adsSeries = (field: string): EvolutionSeries[] =>
        ADS_NETWORKS.map((network) => {
            const meta = NETWORK_META[network] ?? fallbackMeta(network);
            return { label: meta.label.split(' ·')[0], color: meta.brandColor, points: seriesForField(history[network] ?? [], field) };
        });

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {best && (
                <HeroCard
                    title="Mejor performer"
                    network={best.network}
                    value={NETWORK_META[best.network]?.label.split(' ·')[0] ?? best.network}
                    valueLabel={best.label}
                    pct={best.pct}
                    spark={seriesForField(history[best.network] ?? [], PRIMARY_METRIC[best.network]?.field ?? '')}
                    onClick={() =>
                        onDrillDown({
                            title: NETWORK_META[best.network]?.label ?? best.network,
                            metricLabel: best.label,
                            series: performerSeries(best.network),
                        })
                    }
                />
            )}
            {worst && (
                <HeroCard
                    title="Peor performer"
                    network={worst.network}
                    value={NETWORK_META[worst.network]?.label.split(' ·')[0] ?? worst.network}
                    valueLabel={worst.label}
                    pct={worst.pct}
                    spark={seriesForField(history[worst.network] ?? [], PRIMARY_METRIC[worst.network]?.field ?? '')}
                    onClick={() =>
                        onDrillDown({
                            title: NETWORK_META[worst.network]?.label ?? worst.network,
                            metricLabel: worst.label,
                            series: performerSeries(worst.network),
                        })
                    }
                />
            )}
            {hasSpend && (
                <HeroCard
                    title="Inversión total"
                    value={`${spendSymbol}${new Intl.NumberFormat('es-AR').format(totalSpend)}`}
                    valueLabel="Google Ads + Meta Ads"
                    spark={sumSeriesByDate(adsSeries('spend').map((s) => s.points))}
                    onClick={() =>
                        onDrillDown({
                            title: 'Inversión total',
                            metricLabel: 'Gasto — Google Ads + Meta Ads',
                            series: adsSeries('spend'),
                        })
                    }
                />
            )}
            {hasConversions && (
                <HeroCard
                    title="Conversiones totales"
                    value={new Intl.NumberFormat('es-AR').format(totalConversions)}
                    valueLabel="Google Ads + Meta Ads"
                    spark={sumSeriesByDate(adsSeries('conversions').map((s) => s.points))}
                    onClick={() =>
                        onDrillDown({
                            title: 'Conversiones totales',
                            metricLabel: 'Conversiones — Google Ads + Meta Ads',
                            series: adsSeries('conversions'),
                        })
                    }
                />
            )}
        </div>
    );
}

function NetworkCard({
    network,
    result,
    start,
    end,
    history,
    onDrillDown,
}: {
    network: string;
    result: NetworkResult;
    start: string;
    end: string;
    history: HistoryPoint[];
    onDrillDown: (payload: DrillDownPayload) => void;
}) {
    const meta = NETWORK_META[network] ?? fallbackMeta(network);

    // El rango real de la fila cacheada (rangeStart/rangeEnd) puede ser
    // distinto del rango de la página si vino del fallback "cualquier scrape
    // reciente" (ver MetricsController::findFreshCache) — usamos ese en vez
    // del de la página para no etiquetar mal el período mostrado.
    const periodStart = result.rangeStart ?? start;
    const periodEnd = result.rangeEnd ?? end;

    const ctx: SectionCtx = {
        history,
        brandColor: meta.brandColor,
        onDrillDown: (field, label) =>
            onDrillDown({
                title: meta.label,
                metricLabel: label,
                series: [{ label: meta.label.split(' ·')[0], color: meta.brandColor, points: seriesForField(history, field) }],
            }),
    };

    return (
        <Card className="border-t-4" style={meta.accentStyle}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={meta.badgeStyle}>
                        {meta.badge}
                    </span>
                    {meta.label}
                    {result.fromCache && (
                        <span className="ml-auto text-[10px] text-muted-foreground/60">cache</span>
                    )}
                    {!result.fromCache && result.data && (
                        <span className="ml-auto text-[10px] text-muted-foreground/60">en vivo</span>
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
                        <FacebookSection data={result.data} ctx={ctx} />
                    ) : network === 'instagram' ? (
                        <InstagramSection data={result.data} start={periodStart} end={periodEnd} ctx={ctx} />
                    ) : network === 'tiktok' ? (
                        <TiktokSection data={result.data} ctx={ctx} />
                    ) : network === 'youtube' ? (
                        <YoutubeSection data={result.data} ctx={ctx} />
                    ) : network === 'googleAds' || network === 'metaAds' ? (
                        <AdsSection data={result.data} ctx={ctx} />
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

export default function MetricsShow({ client, networkResults: initialResults, start, end, isDefault, history }: Props) {
    const [networkResults, setNetworkResults] = useState(initialResults);
    const [navigating, setNavigating] = useState(false);
    const [pollError, setPollError] = useState<string | null>(null);
    const [desde, setDesde] = useState(start);
    const [hasta, setHasta] = useState(end);
    const [drillDown, setDrillDown] = useState<DrillDownPayload | null>(null);
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
                const res = await fetch(`/metrics/${client.id}/status?start=${start}&end=${end}`);
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
            await fetch('/metrics/cancel', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
            });
        } catch {
            // ignorar error, navegar igual
        }
        router.get('/metrics');
    }

    function handleRefresh() {
        setPollError(null);
        setNavigating(true);
        router.get(`/metrics/${client.id}`, { start, end, force: '1' }, {
            onFinish: () => setNavigating(false),
        });
    }

    function handleApplyRange() {
        if (!rangeValid || !rangeChanged) return;
        setNavigating(true);
        const params = desde === '' && hasta === '' ? {} : { start: desde, end: hasta };
        router.get(`/metrics/${client.id}`, params, {
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
                        <Link href="/metrics" className="text-muted-foreground hover:text-foreground">
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

                <HeroSummary networkResults={networkResults} history={history} onDrillDown={setDrillDown} />

                <div className="grid gap-4 lg:grid-cols-2">
                    {Object.entries(networkResults).map(([network, result]) => (
                        <NetworkCard
                            key={network}
                            network={network}
                            result={result}
                            start={start}
                            end={end}
                            history={history[network] ?? []}
                            onDrillDown={setDrillDown}
                        />
                    ))}
                </div>
            </div>

            <EvolutionDialog
                open={drillDown !== null}
                onOpenChange={(open) => {
                    if (!open) setDrillDown(null);
                }}
                title={drillDown?.title ?? ''}
                metricLabel={drillDown?.metricLabel ?? ''}
                series={drillDown?.series ?? []}
            />
        </>
    );
}

MetricsShow.layout = {
    breadcrumbs: [
        { title: 'Scraper Metricool', href: '/metrics' },
        { title: 'Cliente', href: '#' },
    ],
};
