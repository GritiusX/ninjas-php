import { Head, router } from '@inertiajs/react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as adsRoutes from '@/routes/ads';
import type { AdMetricRow } from '@/types';

type Props = {
    metrics: AdMetricRow[];
    filters: { from: string; to: string };
};

const SEMAFORO = {
    green:  { bg: 'bg-green-500/15',  border: 'border-green-500/40',  text: 'text-green-400',  icon: TrendingUp,   label: 'En objetivo' },
    yellow: { bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', text: 'text-yellow-400', icon: Minus,        label: 'Cerca' },
    red:    { bg: 'bg-red-500/15',    border: 'border-red-500/40',    text: 'text-red-400',    icon: TrendingDown, label: 'Bajo objetivo' },
};

function fmt(n: number, prefix = '') {
    return prefix + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

function MetricCard({ row }: { row: AdMetricRow }) {
    const s = SEMAFORO[row.semaforo];
    const Icon = s.icon;
    const roas = row.roas_periodo ?? 0;
    const pct = row.roas_goal > 0 ? Math.round((roas / row.roas_goal) * 100) : 0;

    return (
        <Card className={`bg-zinc-900 border ${s.border}`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-base text-zinc-100">{row.name}</CardTitle>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                        <Icon className="h-3 w-3" />
                        {s.label}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* ROAS principal */}
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xs text-zinc-500 mb-0.5">ROAS del período</p>
                        <p className={`text-3xl font-bold ${s.text}`}>
                            {roas > 0 ? roas.toFixed(2) : '—'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-zinc-500 mb-0.5">Objetivo</p>
                        <p className="text-lg font-semibold text-zinc-400">{row.roas_goal.toFixed(2)}</p>
                    </div>
                </div>

                {/* Barra de progreso */}
                <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>0</span>
                        <span>{pct}% del objetivo</span>
                        <span>{row.roas_goal.toFixed(2)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${
                                row.semaforo === 'green' ? 'bg-green-500' :
                                row.semaforo === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Stats secundarios */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800">
                    <div>
                        <p className="text-xs text-zinc-500">Inversión</p>
                        <p className="text-sm font-medium text-zinc-300">{fmt(row.total_investment, '$')}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500">Ingresos</p>
                        <p className="text-sm font-medium text-zinc-300">{fmt(row.total_revenue, '$')}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500">Ventas</p>
                        <p className="text-sm font-medium text-zinc-300">{fmt(row.total_transactions)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AdsIndex({ metrics, filters }: Props) {
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    function applyFilters(e: React.FormEvent) {
        e.preventDefault();
        router.get(adsRoutes.index(), { from, to }, { preserveState: true });
    }

    const green  = metrics.filter((m) => m.semaforo === 'green').length;
    const yellow = metrics.filter((m) => m.semaforo === 'yellow').length;
    const red    = metrics.filter((m) => m.semaforo === 'red').length;

    return (
        <>
            <Head title="Panel de Ads" />

            <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100">Panel de Ads</h1>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1.5 text-sm text-green-400">
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                {green} en objetivo
                            </span>
                            <span className="flex items-center gap-1.5 text-sm text-yellow-400">
                                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                                {yellow} cerca
                            </span>
                            <span className="flex items-center gap-1.5 text-sm text-red-400">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                {red} bajo objetivo
                            </span>
                        </div>
                    </div>

                    {/* Filtro de fechas */}
                    <form onSubmit={applyFilters} className="flex items-end gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-400">Desde</Label>
                            <Input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="w-36 h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-400">Hasta</Label>
                            <Input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="w-36 h-8 text-sm"
                            />
                        </div>
                        <Button type="submit" size="sm" variant="outline">
                            Aplicar
                        </Button>
                    </form>
                </div>

                {/* Grid de métricas */}
                {metrics.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {metrics.map((row) => (
                            <MetricCard key={row.id} row={row} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="text-zinc-400">No hay métricas para el período seleccionado.</p>
                    </div>
                )}
            </div>
        </>
    );
}
