import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Download,
    Eye,
    Megaphone,
    Minus,
    RefreshCw,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Users,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as metricsRoutes from '@/routes/metrics';
import type { MetricArea, MonthlyMetricValue } from '@/types';

type Props = {
    client: {
        id: number;
        name: string;
        metricool_blog_id: string | null;
    };
    period: {
        year: number;
        month: number;
        label: string;
        last_sync: string | null;
        available: string[];
    };
    metrics: Record<MetricArea, MonthlyMetricValue[]>;
};

const AREA_META: Record<
    MetricArea,
    { label: string; description: string; icon: typeof Eye }
> = {
    awareness: {
        label: 'Crecimiento de marca',
        description: 'Volumen, alcance y eficiencia de awareness.',
        icon: Eye,
    },
    content: {
        label: 'Contenido orgánico',
        description: 'Volumen creativo y calidad real por pieza.',
        icon: Sparkles,
    },
    community: {
        label: 'Comunidad',
        description: 'Adquisición, fidelidad y conexión real.',
        icon: Users,
    },
    ads: {
        label: 'Performance Ads',
        description: 'Inversión y rentabilidad publicitaria.',
        icon: Megaphone,
    },
    system: {
        label: 'Eficiencia del sistema',
        description: 'Salud y sustentabilidad del marketing.',
        icon: Wrench,
    },
};

const METRIC_LABELS: Record<string, { label: string; format: 'number' | 'currency' | 'percent' | 'ratio'; hint?: string }> = {
    impressions_total:    { label: 'Impresiones',           format: 'number',   hint: 'IG + FB'        },
    reach_total:          { label: 'Alcance total',         format: 'number',   hint: 'IG + FB'        },
    reach_organic:        { label: 'Alcance orgánico',      format: 'number',   hint: 'IG + FB'        },
    reach_paid:           { label: 'Alcance pago',          format: 'number',   hint: 'Google Ads'     },
    reel_views:           { label: 'Reproducciones reels',  format: 'number',   hint: 'Instagram'      },
    frequency_avg:        { label: 'Frecuencia promedio',   format: 'ratio',    hint: 'Meta Ads'       },
    cost_per_reach:       { label: 'Costo por alcance',     format: 'currency', hint: 'Meta Ads'       },

    reels_count:          { label: 'Cantidad de reels',     format: 'number',   hint: 'Instagram'      },
    stories_count:        { label: 'Cantidad de stories',   format: 'number',   hint: 'Instagram'      },
    posts_count:          { label: 'Cantidad de posts',     format: 'number',   hint: 'IG + FB'        },
    reach_per_reel:       { label: 'Alcance por reel',      format: 'number',   hint: 'Instagram'      },
    shares_avg:           { label: 'Shares promedio',       format: 'number',   hint: 'IG + FB'        },
    saves_avg:            { label: 'Guardados promedio',    format: 'number',   hint: 'Instagram'      },
    comments_avg:         { label: 'Comentarios promedio',  format: 'number',   hint: 'IG + FB'        },
    engagement_rate:      { label: 'Engagement rate',       format: 'percent',  hint: 'Instagram'      },
    reels_pct:            { label: '% reels sobre total',   format: 'percent',  hint: 'Instagram'      },
    virality_relative:    { label: 'Viralidad relativa',    format: 'ratio',    hint: 'Instagram'      },

    ig_followers_total:   { label: 'Seguidores',            format: 'number',   hint: 'Instagram'      },
    fb_followers_total:   { label: 'Seguidores / Me gusta', format: 'number',   hint: 'Facebook'       },
    followers_gained:     { label: 'Seguidores ganados',    format: 'number',   hint: 'Facebook'       },
    followers_lost:       { label: 'Seguidores perdidos',   format: 'number',   hint: 'Facebook'       },
    followers_net:        { label: 'Balance neto',          format: 'number',   hint: 'Facebook'       },
    follow_ratio:         { label: 'Ratio follow/unfollow', format: 'ratio',    hint: 'Facebook'       },
    story_replies:        { label: 'Respuestas a stories',  format: 'number',   hint: 'Instagram'      },
    dms:                  { label: 'DMs generados',         format: 'number',   hint: 'Instagram'      },
    growth_efficiency:    { label: 'Growth efficiency',     format: 'ratio',    hint: 'IG + FB'        },

    spend_total:          { label: 'Gasto total',           format: 'currency', hint: 'Google Ads'     },
    roas:                 { label: 'ROAS',                  format: 'ratio',    hint: 'Google Ads'     },
    cpa:                  { label: 'CPA',                   format: 'currency', hint: 'Google Ads'     },
    cpc:                  { label: 'CPC',                   format: 'currency', hint: 'Google Ads'     },
    ctr:                  { label: 'CTR',                   format: 'percent',  hint: 'Google Ads'     },
    conversions:          { label: 'Conversiones',          format: 'number',   hint: 'Google Ads'     },
    conversion_value:     { label: 'Valor conversiones',    format: 'currency', hint: 'Google Ads'     },
    conversion_rate:      { label: 'Tasa de conversión',    format: 'percent',  hint: 'Google Ads'     },
    cac:                  { label: 'CAC',                   format: 'currency', hint: 'Google Ads'     },

    organic_share_pct:    { label: '% alcance orgánico',    format: 'percent',  hint: 'IG + FB'        },
    cpm_avg:              { label: 'CPM promedio',          format: 'currency', hint: 'Google Ads'     },
    ctr_avg:              { label: 'CTR promedio',          format: 'percent',  hint: 'Google Ads'     },
    cpc_avg:              { label: 'CPC promedio',          format: 'currency', hint: 'Google Ads'     },
    mer:                  { label: 'MER (Fase 2)',          format: 'ratio'                            },
};

function fmt(value: number | null, kind: 'number' | 'currency' | 'percent' | 'ratio'): string {
    if (value === null || Number.isNaN(value)) return '—';

    switch (kind) {
        case 'currency':
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
        case 'percent':
            return `${value.toFixed(1)}%`;
        case 'ratio':
            return value.toFixed(2);
        default:
            return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value);
    }
}

function deltaColor(delta: number | null): string {
    if (delta === null) return 'text-muted-foreground';
    if (delta > 1) return 'text-green-400';
    if (delta < -1) return 'text-red-400';
    return 'text-yellow-400';
}

function deltaIcon(delta: number | null) {
    if (delta === null) return Minus;
    if (delta > 1) return TrendingUp;
    if (delta < -1) return TrendingDown;
    return Minus;
}

function MetricCard({ metric }: { metric: MonthlyMetricValue }) {
    const def = METRIC_LABELS[metric.metric_key] ?? { label: metric.metric_key, format: 'number' as const };
    const DeltaIcon = deltaIcon(metric.delta_pct);

    return (
        <div className="rounded-lg border border-border bg-card/40 p-3">
            <div className="flex items-start justify-between gap-1">
                <p className="text-xs text-muted-foreground">{def.label}</p>
                {def.hint && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {def.hint}
                    </span>
                )}
            </div>
            <p className="mt-1 text-xl font-semibold text-foreground">
                {fmt(metric.value, def.format)}
            </p>
            <div className={`mt-1 flex items-center gap-1 text-xs ${deltaColor(metric.delta_pct)}`}>
                <DeltaIcon className="h-3 w-3" />
                {metric.delta_pct === null ? (
                    <span>vs mes anterior: —</span>
                ) : (
                    <span>
                        {metric.delta_pct > 0 ? '+' : ''}
                        {metric.delta_pct.toFixed(1)}% vs mes anterior
                    </span>
                )}
            </div>
        </div>
    );
}

function AreaSection({ area, items }: { area: MetricArea; items: MonthlyMetricValue[] }) {
    const meta = AREA_META[area];
    const Icon = meta.icon;

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg text-foreground">
                            {meta.label}
                        </CardTitle>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {meta.description}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {items.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                        Sin datos para este período.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                        {items.map((m) => (
                            <MetricCard key={m.metric_key} metric={m} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function MetricsShow({ client, period, metrics }: Props) {
    const [period_, setPeriod] = useState(`${period.year}-${String(period.month).padStart(2, '0')}`);
    const [syncing, setSyncing] = useState(false);
    const defaultStart = `${period.year}-${String(period.month).padStart(2, '0')}`;
    const [syncStart, setSyncStart] = useState(defaultStart);
    const [syncEnd, setSyncEnd]     = useState(defaultStart);

    function changePeriod(value: string) {
        setPeriod(value);
        router.get(metricsRoutes.show.url(client.id), { period: value }, { preserveState: false });
    }

    function syncNow() {
        if (!client.metricool_blog_id) return;
        setSyncing(true);
        router.post(
            metricsRoutes.sync.url(client.id),
            { start_date: syncStart, end_date: syncEnd, inline: 1 },
            {
                preserveScroll: true,
                onFinish: () => setSyncing(false),
            },
        );
    }

    const lastSync = period.last_sync
        ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(period.last_sync))
        : '—';

    return (
        <>
            <Head title={`Métricas — ${client.name}`} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Link href={metricsRoutes.index()}>
                            <Button variant="ghost" size="sm" className="text-muted-foreground">
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                Volver al listado
                            </Button>
                        </Link>
                        <h1 className="mt-1 text-2xl font-bold text-foreground">{client.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            Período: <span className="capitalize text-foreground">{period.label}</span>
                            <span className="mx-2 text-muted-foreground/50">·</span>
                            Última sync: <span className="text-foreground">{lastSync}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Ver período</label>
                            <select
                                value={period_}
                                onChange={(e) => changePeriod(e.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            >
                                {(period.available.length > 0 ? period.available : [period_]).map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div className="h-9 w-px bg-border self-end mb-0.5" />

                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Sincronizar desde</label>
                            <input
                                type="month"
                                value={syncStart}
                                onChange={(e) => setSyncStart(e.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">hasta</label>
                            <input
                                type="month"
                                value={syncEnd}
                                min={syncStart}
                                onChange={(e) => setSyncEnd(e.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={syncing || !client.metricool_blog_id}
                            onClick={syncNow}
                        >
                            <RefreshCw className={`mr-1.5 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Sincronizar'}
                        </Button>
                        <a
                            href={`/metrics/${client.id}/pdf?period=${period_}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Button type="button" variant="secondary" size="sm">
                                <Download className="mr-1.5 h-4 w-4" />
                                Descargar reporte
                            </Button>
                        </a>
                    </div>
                </div>

                {!client.metricool_blog_id && (
                    <Card className="border-yellow-500/40 bg-yellow-500/5">
                        <CardContent className="py-4 text-sm text-yellow-300">
                            Este cliente no tiene cargado <strong>metricool_blog_id</strong>. Configurálo desde el módulo de admin antes de sincronizar.
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-4">
                    <AreaSection area="awareness" items={metrics.awareness ?? []} />
                    <AreaSection area="content"   items={metrics.content   ?? []} />
                    <AreaSection area="community" items={metrics.community ?? []} />
                    <AreaSection area="ads"       items={metrics.ads       ?? []} />
                    <AreaSection area="system"    items={metrics.system    ?? []} />
                </div>
            </div>
        </>
    );
}
