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
    const [dlProgress, setDlProgress] = useState<{ ready: number; total: number } | null>(null);

    async function handleDownloadAll() {
        setDlState('generating');
        setDlError(null);
        setDlProgress(null);

        try {
            // Step 1: fire generation (returns immediately)
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            const genRes = await fetch('/metrics/reports-generate', {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken },
            });
            if (!genRes.ok) throw new Error(`Error al generar (${genRes.status})`);
            const { total } = await genRes.json() as { total: number };

            // Step 2: poll until all clients are resolved (ready or unsupported)
            let ready = 0;
            for (let attempt = 0; attempt < 12; attempt++) {
                await new Promise((r) => setTimeout(r, 15_000));
                const statusRes = await fetch('/metrics/reports-status');
                if (statusRes.ok) {
                    const data = await statusRes.json() as { total: number; ready: number; unsupported: number; done: boolean };
                    ready = data.ready;
                    const supported = data.total - data.unsupported;
                    setDlProgress({ ready: data.ready, total: supported });
                    if (data.done) break;
                }
            }

            if (ready === 0) throw new Error('No hay reportes disponibles. Es posible que esta función requiera un plan Metricool específico.');

            // Step 3: download ZIP (fast, no waiting server-side)
            setDlState('downloading');
            const zipRes = await fetch('/metrics/reports-zip');
            if (!zipRes.ok) throw new Error(`Error al descargar (${zipRes.status})`);

            const blob = await zipRes.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const month = new Date(); month.setDate(0);
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
                            {dlState === 'generating' && 'Generando reportes en Metricool y esperando que estén listos...'}
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
                                            <p>Metricool está generando los PDFs.</p>
                                            {dlProgress ? (
                                                <p className="mt-2 text-base font-semibold text-foreground">
                                                    {dlProgress.ready} / {dlProgress.total} listos
                                                </p>
                                            ) : (
                                                <p className="mt-1 font-medium">Esperando respuesta...</p>
                                            )}
                                        </>
                                    ) : (
                                        <p>Empaquetando el ZIP, ya casi...</p>
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
