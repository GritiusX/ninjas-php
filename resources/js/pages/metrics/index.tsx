import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Clock, Download, FileArchive, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import * as metricsRoutes from '@/routes/metrics';
import type { MetricsClientSummary } from '@/types';

type Props = {
    clients: MetricsClientSummary[];
};

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(iso));
}

type DownloadState = 'idle' | 'generating' | 'downloading' | 'done' | 'error';

export default function MetricsIndex({ clients }: Props) {
    const linked = clients.filter((c) => c.metricool_blog_id);
    const unlinked = clients.filter((c) => !c.metricool_blog_id);

    const [dlState, setDlState] = useState<DownloadState>('idle');
    const [dlError, setDlError] = useState<string | null>(null);

    async function handleDownloadAll() {
        setDlState('generating');
        setDlError(null);

        try {
            const response = await fetch('/metrics/reports-zip');

            if (!response.ok) {
                throw new Error(`Error del servidor (${response.status})`);
            }

            setDlState('downloading');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const month = new Date();
            month.setDate(0); // last day of previous month
            a.href = url;
            a.download = `reportes-metricool-${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setDlState('done');
            setTimeout(() => setDlState('idle'), 3000);
        } catch (err) {
            setDlError(err instanceof Error ? err.message : 'Error desconocido');
            setDlState('error');
        }
    }

    const modalOpen = dlState !== 'idle';

    return (
        <>
            <Head title="Métricas" />

            <Dialog open={modalOpen} onOpenChange={(open) => { if (!open && dlState !== 'generating' && dlState !== 'downloading') setDlState('idle'); }}>
                <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (dlState === 'generating' || dlState === 'downloading') e.preventDefault(); }}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileArchive className="h-5 w-5 text-primary" />
                            Reportes Metricool
                        </DialogTitle>
                        <DialogDescription>
                            {dlState === 'generating' && 'Solicitando generación de reportes a Metricool...'}
                            {dlState === 'downloading' && 'Empaquetando y descargando el ZIP...'}
                            {dlState === 'done' && 'Descarga completada.'}
                            {dlState === 'error' && 'No se pudo completar la descarga.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-4 py-4">
                        {(dlState === 'generating' || dlState === 'downloading') && (
                            <>
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <div className="text-center text-sm text-muted-foreground">
                                    {dlState === 'generating' ? (
                                        <>
                                            <p>Metricool está generando los PDFs de todos los clientes.</p>
                                            <p className="mt-1 font-medium">Esto puede tardar entre 1 y 2 minutos.</p>
                                        </>
                                    ) : (
                                        <p>Preparando el archivo ZIP, ya casi...</p>
                                    )}
                                </div>
                            </>
                        )}

                        {dlState === 'done' && (
                            <>
                                <CheckCircle2 className="h-10 w-10 text-green-400" />
                                <p className="text-sm text-muted-foreground">El ZIP se descargó correctamente.</p>
                            </>
                        )}

                        {dlState === 'error' && (
                            <>
                                <XCircle className="h-10 w-10 text-destructive" />
                                <p className="text-sm text-muted-foreground">{dlError}</p>
                                <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                                    Reintentar
                                </Button>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <div className="space-y-6 px-4 py-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Métricas de clientes
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Snapshot mensual cerrado con datos de Metricool. El sync corre
                            automáticamente el día 2 de cada mes.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={handleDownloadAll}
                        disabled={dlState === 'generating' || dlState === 'downloading'}
                    >
                        {dlState === 'generating' || dlState === 'downloading' ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-1.5 h-4 w-4" />
                        )}
                        Reportes Metricool
                    </Button>
                </div>

                {clients.length === 0 ? (
                    <Card className="bg-card border-border">
                        <CardContent className="py-10 text-center text-muted-foreground">
                            Todavía no hay clientes cargados.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {linked.map((c) => (
                                <ClientCard key={c.id} client={c} />
                            ))}
                        </div>

                        {unlinked.length > 0 && (
                            <div className="space-y-3 pt-4">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                    Sin conectar a Metricool
                                </h2>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {unlinked.map((c) => (
                                        <Card
                                            key={c.id}
                                            className="border-border/60 bg-card/50"
                                        >
                                            <CardContent className="flex items-center justify-between gap-3 py-4">
                                                <div className="flex items-center gap-2 text-foreground">
                                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{c.name}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    Cargá el blog ID
                                                </span>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

function ClientCard({ client }: { client: MetricsClientSummary }) {
    const ready = client.has_data;

    return (
        <Card className="bg-card border-border transition hover:border-primary/40">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base text-foreground">
                        {client.name}
                    </CardTitle>
                    <span
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            ready
                                ? 'bg-green-500/15 text-green-400'
                                : 'bg-yellow-500/15 text-yellow-400'
                        }`}
                    >
                        {ready ? (
                            <CheckCircle2 className="h-3 w-3" />
                        ) : (
                            <Clock className="h-3 w-3" />
                        )}
                        {ready ? 'Datos listos' : 'Sin sincronizar'}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                        <span>Blog ID</span>
                        <span className="font-mono text-foreground">
                            {client.metricool_blog_id ?? '—'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Última sync</span>
                        <span className="text-foreground">
                            {formatDate(client.last_synced_at)}
                        </span>
                    </div>
                </div>
                <Link href={metricsRoutes.show.url(client.id)}>
                    <Button size="sm" variant="outline" className="w-full">
                        Ver dashboard
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
