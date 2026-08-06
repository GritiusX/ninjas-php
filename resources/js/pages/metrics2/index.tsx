import { Head, router } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrapingOverlay } from '@/components/scraping-overlay';

type ClientRow = {
    id: number;
    name: string;
    networks: string[];
    cachedCount: number;
    totalNetworks: number;
};

type Props = {
    clients: ClientRow[];
    start: string;
    end: string;
};

const NETWORK_LABELS: Record<string, string> = {
    facebook: 'FB',
    instagram: 'IG',
    tiktok: 'TT',
    youtube: 'YT',
    googleAds: 'GA',
    metaAds: 'MA',
};

const NETWORK_COLORS: Record<string, string> = {
    facebook:  'bg-blue-100 text-blue-700',
    instagram: 'bg-pink-100 text-pink-700',
    tiktok:    'bg-purple-100 text-purple-700',
    youtube:   'bg-red-100 text-red-700',
    googleAds: 'bg-green-100 text-green-700',
    metaAds:   'bg-indigo-100 text-indigo-700',
};

function formatDate(iso: string) {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso + 'T00:00:00'));
}

export default function Metrics2Index({ clients, start, end }: Props) {
    const [loading, setLoading] = useState(false);
    const [desde, setDesde] = useState(start);
    const [hasta, setHasta] = useState(end);

    const rangeChanged = desde !== start || hasta !== end;
    const rangeValid = desde !== '' && hasta !== '' && desde <= hasta;
    // Si el usuario dejó los inputs en un estado inválido (vacíos o desde > hasta),
    // navegamos con el último rango aplicado en vez de mandar algo inconsistente.
    const effectiveStart = rangeValid ? desde : start;
    const effectiveEnd = rangeValid ? hasta : end;

    function handleClientClick(clientId: number) {
        setLoading(true);
        router.get(`/metrics2/${clientId}`, { start: effectiveStart, end: effectiveEnd }, {
            onFinish: () => setLoading(false),
        });
    }

    function handleApplyRange() {
        if (!rangeValid) return;
        setLoading(true);
        router.get('/metrics2', { start: desde, end: hasta }, {
            onFinish: () => setLoading(false),
        });
    }

    return (
        <>
            <Head title="Scraper Metricool" />
            <ScrapingOverlay visible={loading} />

            <div className="flex flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold">Scraper Metricool</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Rango activo: {formatDate(start)} — {formatDate(end)}
                    </p>
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
                    <Button
                        size="sm"
                        onClick={handleApplyRange}
                        disabled={!rangeValid || !rangeChanged || loading}
                    >
                        Aplicar rango
                    </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {clients.map((client) => {
                        const allCached = client.cachedCount === client.totalNetworks;
                        const someCached = client.cachedCount > 0 && !allCached;

                        return (
                            <Card
                                key={client.id}
                                className="hover:border-primary/50 cursor-pointer transition-colors"
                                onClick={() => handleClientClick(client.id)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">{client.name}</CardTitle>
                                        <ArrowRight className="text-muted-foreground h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between">
                                    <div className="flex flex-wrap gap-1">
                                        {client.networks.map((net) => (
                                            <span
                                                key={net}
                                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${NETWORK_COLORS[net] ?? 'bg-gray-100 text-gray-600'}`}
                                            >
                                                {NETWORK_LABELS[net] ?? net}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs">
                                        {allCached ? (
                                            <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600">en cache</span></>
                                        ) : someCached ? (
                                            <><Circle className="h-3.5 w-3.5 text-yellow-500" /><span className="text-yellow-600">{client.cachedCount}/{client.totalNetworks}</span></>
                                        ) : (
                                            <><Circle className="text-muted-foreground h-3.5 w-3.5" /><span className="text-muted-foreground">sin datos</span></>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

Metrics2Index.layout = {
    breadcrumbs: [
        { title: 'Scraper Metricool', href: '/metrics2' },
    ],
};
