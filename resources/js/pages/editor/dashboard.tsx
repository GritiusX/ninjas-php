import { Head, Link, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, ExternalLink, Filter } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriorityBadge } from '@/components/priority-badge';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
};

function PieceCard({ piece, isActive }: { piece: ContentPiece; isActive?: boolean }) {
    const deadline = formatDeadline(piece.deadline);

    return (
        <>
            <Card className={`bg-card ${isActive ? 'border-blue-500/60' : 'border-border'}`}>
                <CardContent className="p-4">
                    {isActive && (
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

                        <Link href={editorRoutes.task.url(piece.id)} className="shrink-0">
                            <Button size="sm" variant={isActive ? 'default' : 'outline'}>
                                Abrir tarea
                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}

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

    return (
        <>
            <Head title="Mi panel" />

            <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Hola, {auth.user.name.split(' ')[0]} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">Tus tareas activas</p>
                </div>

                {/* Filtro por cliente */}
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

                {/* Stats */}
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

                {/* Pendientes */}
                {pending.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Para trabajar ({pending.length})
                        </h2>
                        {pending.map((piece, i) => (
                            <PieceCard key={piece.id} piece={piece} isActive={i === 0} />
                        ))}
                    </section>
                )}

                {/* En revisión */}
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

                {/* En revisión del cliente */}
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
