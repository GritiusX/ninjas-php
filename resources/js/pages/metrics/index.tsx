import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Clock, Download, FileArchive, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
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

    type SyncState = { open: false } | { open: true; current: number; total: number; currentName: string; errors: string[] };
    const [syncState, setSyncState] = useState<SyncState>({ open: false });
    const abortRef = useRef(false);

    async function handleSyncAll() {
        const targets = linked; // only clients with metricool_blog_id
        if (!targets.length) return;

        abortRef.current = false;
        setSyncState({ open: true, current: 0, total: targets.length, currentName: targets[0].name, errors: [] });

        const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        const errors: string[] = [];

        for (let i = 0; i < targets.length; i++) {
            if (abortRef.current) break;
            const client = targets[i];
            setSyncState({ open: true, current: i + 1, total: targets.length, currentName: client.name, errors });

            try {
                const res = await fetch(`/metrics/${client.id}/sync-one`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({})) as { error?: string };
                    errors.push(`${client.name}: ${body.error ?? res.status}`);
                }
            } catch {
                errors.push(`${client.name}: error de red`);
            }
        }

        setSyncState({ open: false });
        router.reload({ only: ['clients'] });
    }

    function handleCancelSync() {
        abortRef.current = true;
        setSyncState({ open: false });
    }

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

            {/* Modal sync progreso */}
            <Dialog open={syncState.open} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-primary" />
                            Sincronizando métricas
                        </DialogTitle>
                        <DialogDescription>
                            Esto puede tardar varios minutos. No cierres esta ventana.
                        </DialogDescription>
                    </DialogHeader>

                    {syncState.open && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Progreso</span>
                                    <span className="font-medium text-foreground">
                                        {syncState.current - 1} / {syncState.total}
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${Math.round(((syncState.current - 1) / syncState.total) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                <span>Sincronizando <span className="font-medium text-foreground">{syncState.currentName}</span>...</span>
                            </div>

                            {syncState.errors.length > 0 && (
                                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive space-y-0.5">
                                    {syncState.errors.map((e, i) => <p key={i}>{e}</p>)}
                                </div>
                            )}

                            <Button variant="outline" size="sm" className="w-full" onClick={handleCancelSync}>
                                Cancelar
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

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
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSyncAll}
                            disabled={syncState.open}
                        >
                            {syncState.open ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-1.5 h-4 w-4" />
                            )}
                            Sincronizar todos
                        </Button>
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
