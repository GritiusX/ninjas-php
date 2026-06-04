import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, ExternalLink, Filter, PauseCircle } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriorityBadge } from '@/components/priority-badge';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import * as editorRoutes from '@/routes/editor';
import type { Auth, ContentPiece } from '@/types';

type Stats = {
    pending: number;
    in_review: number;
    approved_week: number;
};

type Props = {
    pieces: ContentPiece[];
    stats: Stats;
};

function formatDeadline(deadline: string | null) {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `Vencido hace ${Math.abs(diffDays)}d`, urgent: true };
    if (diffDays === 0) return { label: 'Hoy', urgent: true };
    if (diffDays === 1) return { label: 'Mañana', urgent: true };
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return { label: `${d}/${m}`, urgent: false };
}

function isPaused(piece: ContentPiece): boolean {
    return !!piece.paused_until && new Date(piece.paused_until) > new Date();
}

function pausedUntilLabel(pausedUntil: string): string {
    const date = new Date(pausedUntil);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `Pausada hasta las ${h}:${m}`;
}

// ─── Modal de pausa ───────────────────────────────────────────────────────────

function PauseModal({ piece, onClose }: { piece: ContentPiece; onClose: () => void }) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function handleSubmit() {
        if (!reason.trim()) return;
        setSubmitting(true);
        router.post(
            `/editor/task/${piece.id}/pause`,
            { reason },
            {
                preserveScroll: true,
                onSuccess: onClose,
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PauseCircle className="h-5 w-5 text-muted-foreground" />
                        Pausar tarea
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 py-1">
                    <p className="text-sm text-muted-foreground">
                        La tarea quedará pausada <strong>4 horas</strong>. Se notificará al revisor con tu comentario.
                    </p>
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                        <span className="font-medium text-foreground">
                            {piece.concept ?? piece.product ?? `Tarea #${piece.id}`}
                        </span>
                        {piece.client && (
                            <span className="ml-2 text-muted-foreground">— {piece.client.name}</span>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="pause-reason">Razón de la pausa <span className="text-destructive">*</span></Label>
                        <textarea
                            id="pause-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ej: Esperando material del cliente, problema técnico con el archivo..."
                            className="min-h-[90px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={!reason.trim() || submitting}>
                        <PauseCircle className="mr-1.5 h-4 w-4" />
                        {submitting ? 'Pausando...' : 'Pausar 4 horas'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Card de tarea ────────────────────────────────────────────────────────────

function PieceCard({ piece, isActive }: { piece: ContentPiece; isActive?: boolean }) {
    const deadline = formatDeadline(piece.deadline);
    const paused = isPaused(piece);
    const [pauseOpen, setPauseOpen] = useState(false);
    const canPause = ['BRIEF', 'EDITING', 'REVISION'].includes(piece.status) && !paused;

    return (
        <>
            <Card className={`transition-opacity ${paused ? 'border-border opacity-50 grayscale' : isActive ? 'border-blue-500/60' : 'border-border'}`}>
                <CardContent className="p-4">
                    {paused && piece.paused_until && (
                        <div className="flex items-center gap-1.5 mb-2">
                            <PauseCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {pausedUntilLabel(piece.paused_until)}
                            </span>
                        </div>
                    )}
                    {!paused && isActive && (
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Tarea activa</span>
                        </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    {piece.client?.name}
                                </span>
                                <StatusBadge status={piece.status} />
                                <PriorityBadge priority={piece.priority} />
                                {deadline && (
                                    <span className={`flex items-center gap-1 text-xs ${deadline.urgent ? 'text-red-400' : 'text-muted-foreground'}`}>
                                        <Clock className="h-3 w-3" />
                                        {deadline.label}
                                    </span>
                                )}
                            </div>

                            <p className="font-medium text-foreground truncate">
                                {piece.concept || piece.product || 'Sin concepto'}
                            </p>

                            {piece.objective && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {piece.objective}
                                </p>
                            )}

                            {paused && piece.pause_reason && (
                                <p className="mt-2 text-xs text-muted-foreground italic">
                                    "{piece.pause_reason}"
                                </p>
                            )}

                            {piece.status === 'REVISION' && piece.internal_comments && (
                                <div className="mt-3 p-3 rounded-md bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800/50">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <AlertCircle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Comentarios del PM</span>
                                    </div>
                                    <p className="text-sm text-orange-800 dark:text-orange-200">{piece.internal_comments}</p>
                                </div>
                            )}

                            {piece.final_video_link && (
                                <a
                                    href={piece.final_video_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Ver video subido
                                </a>
                            )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-2">
                            {canPause && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-muted-foreground hover:text-foreground"
                                    onClick={() => setPauseOpen(true)}
                                >
                                    <PauseCircle className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            <Link href={editorRoutes.task.url(piece.id)}>
                                <Button size="sm" variant={!paused && isActive ? 'default' : 'outline'}>
                                    Abrir
                                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {pauseOpen && <PauseModal piece={piece} onClose={() => setPauseOpen(false)} />}
        </>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function EditorDashboard({ pieces, stats }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [clientFilter, setClientFilter] = useState<string>('all');

    const uniqueClients = Array.from(
        new Map(pieces.filter(p => p.client).map(p => [p.client!.id, p.client!])).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    const filtered = clientFilter === 'all' ? pieces : pieces.filter(p => String(p.client?.id) === clientFilter);

    const pending = filtered.filter((p) => ['BRIEF', 'EDITING', 'REVISION'].includes(p.status));
    const inReview = filtered.filter((p) => p.status === 'INTERNAL_REVIEW');
    const clientReview = filtered.filter((p) => ['CLIENT_REVIEW', 'CLIENT_REVISION', 'PM_APPROVED'].includes(p.status));

    // Tareas pausadas al fondo; la primera no-pausada es la activa
    const sortedPending = [
        ...pending.filter(p => !isPaused(p)),
        ...pending.filter(p => isPaused(p)),
    ];

    return (
        <>
            <Head title="Mi panel" />

            <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Hola, {auth.user.name.split(' ')[0]} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">Tus tareas activas</p>
                </div>

                {uniqueClients.length > 1 && (
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Select value={clientFilter} onValueChange={setClientFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Todos los clientes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los clientes</SelectItem>
                                {uniqueClients.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-foreground">{stats.pending}</p>
                            <p className="text-xs text-muted-foreground mt-1">En proceso</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-amber-400">{stats.in_review}</p>
                            <p className="text-xs text-muted-foreground mt-1">En revisión</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-green-400">{stats.approved_week}</p>
                            <p className="text-xs text-muted-foreground mt-1">Aprobados (7d)</p>
                        </CardContent>
                    </Card>
                </div>

                {sortedPending.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Para trabajar ({sortedPending.length})
                        </h2>
                        {sortedPending.map((piece, i) => (
                            <PieceCard key={piece.id} piece={piece} isActive={i === 0} />
                        ))}
                    </section>
                )}

                {inReview.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            En revisión interna ({inReview.length})
                        </h2>
                        {inReview.map((piece) => (
                            <PieceCard key={piece.id} piece={piece} />
                        ))}
                    </section>
                )}

                {clientReview.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Con el cliente ({clientReview.length})
                        </h2>
                        {clientReview.map((piece) => (
                            <PieceCard key={piece.id} piece={piece} />
                        ))}
                    </section>
                )}

                {pieces.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                        <p className="text-lg font-medium text-foreground">Todo al día</p>
                        <p className="text-sm text-muted-foreground mt-1">No tenés tareas asignadas en este momento.</p>
                    </div>
                )}
            </div>
        </>
    );
}
