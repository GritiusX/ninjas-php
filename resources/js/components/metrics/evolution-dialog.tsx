import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SparklinePoint } from './sparkline';

export type EvolutionSeries = {
    label: string;
    color: string;
    points: SparklinePoint[];
};

function formatShortDate(iso: string) {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date(iso + 'T00:00:00'));
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const PADDING = 28;

// Dos redes pueden tener colores de marca parecidos (ej. los azules de Google
// Ads y Meta Ads) — el patrón de trazo da una segunda señal para distinguir
// series que no depende solo del tono de color.
const DASH_PATTERNS = ['none', '6 4', '2 3'];

function buildPath(points: SparklinePoint[], min: number, range: number): string {
    const innerWidth = CHART_WIDTH - PADDING * 2;
    const innerHeight = CHART_HEIGHT - PADDING * 2;

    return points
        .map((p, i) => {
            const x = PADDING + (points.length === 1 ? innerWidth / 2 : (i / (points.length - 1)) * innerWidth);
            const y = PADDING + innerHeight - ((p.value - min) / range) * innerHeight;

            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
}

// Gráfico grande de evolución para el drill-down. Soporta varias series con
// una escala compartida (ej. Google Ads vs Meta Ads) en vez de sumarlas en una
// sola línea, que sería engañoso para dos métricas independientes.
export function EvolutionDialog({
    open,
    onOpenChange,
    title,
    metricLabel,
    series,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    metricLabel: string;
    series: EvolutionSeries[];
}) {
    const usableSeries = series.filter((s) => s.points.length >= 2);
    const allValues = usableSeries.flatMap((s) => s.points.map((p) => p.value));
    const min = allValues.length ? Math.min(...allValues) : 0;
    const max = allValues.length ? Math.max(...allValues) : 1;
    const range = max - min || 1;

    const referencePoints = usableSeries[0]?.points ?? [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <p className="text-muted-foreground text-sm">{metricLabel}</p>
                </DialogHeader>

                {usableSeries.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                        Todavía no hay suficiente historial para graficar esta métrica.
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {usableSeries.length > 1 && (
                            <div className="flex flex-wrap gap-4">
                                {usableSeries.map((s, i) => (
                                    <span key={s.label} className="flex items-center gap-1.5 text-xs">
                                        <svg width="16" height="8" aria-hidden="true">
                                            <line
                                                x1="0" y1="4" x2="16" y2="4"
                                                stroke={s.color}
                                                strokeWidth={2}
                                                strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length]}
                                            />
                                        </svg>
                                        {s.label}
                                    </span>
                                ))}
                            </div>
                        )}

                        <svg
                            width="100%"
                            height={CHART_HEIGHT}
                            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                            className="overflow-visible"
                        >
                            {usableSeries.map((s, i) => (
                                <path
                                    key={s.label}
                                    d={buildPath(s.points, min, range)}
                                    fill="none"
                                    stroke={s.color}
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length]}
                                />
                            ))}
                        </svg>

                        {referencePoints.length > 0 && (
                            <div className="text-muted-foreground flex justify-between text-xs">
                                <span>{formatShortDate(referencePoints[0].date)}</span>
                                <span>{formatShortDate(referencePoints[referencePoints.length - 1].date)}</span>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
