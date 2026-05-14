import { Head, Link, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, ExternalLink } from 'lucide-react';
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
    return { label: `${diffDays}d`, urgent: false };
};

function PieceCard({ piece, isActive }: { piece: ContentPiece; isActive?: boolean }) {
    const deadline = formatDeadline(piece.deadline);

    return (
        <>
            <Card className={`bg-zinc-900 ${isActive ? 'border-blue-500/60' : 'border-zinc-800'}`}>
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
                                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                                    {piece.client?.name}
                                </span>
                                <StatusBadge status={piece.status} />
                                <PriorityBadge priority={piece.priority} />
                                {deadline && (
                                    <span className={`flex items-center gap-1 text-xs ${deadline.urgent ? 'text-red-400' : 'text-zinc-400'}`}>
                                        <Clock className="h-3 w-3" />
                                        {deadline.label}
                                    </span>
                                )}
                            </div>

                            <p className="font-medium text-zinc-100 truncate">
                                {piece.concept || piece.product || 'Sin concepto'}
                            </p>

                            {piece.objective && (
                                <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                                    {piece.objective}
                                </p>
                            )}

                            {piece.status === 'REVISION' && piece.internal_comments && (
                                <div className="mt-3 p-3 rounded-md bg-orange-950/50 border border-orange-800/50">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
                                        <span className="text-xs font-medium text-orange-400">Comentarios del PM</span>
                                    </div>
                                    <p className="text-sm text-orange-200">{piece.internal_comments}</p>
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

    const pending = pieces.filter((p) => ['BRIEF', 'EDITING', 'REVISION'].includes(p.status));
    const inReview = pieces.filter((p) => p.status === 'INTERNAL_REVIEW');
    const clientReview = pieces.filter((p) => ['CLIENT_REVIEW', 'CLIENT_REVISION', 'PM_APPROVED'].includes(p.status));

    return (
        <>
            <Head title="Mi panel" />

            <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">
                        Hola, {auth.user.name.split(' ')[0]} 👋
                    </h1>
                    <p className="text-zinc-400 mt-1">Tus tareas activas</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-zinc-100">{stats.pending}</p>
                            <p className="text-xs text-zinc-400 mt-1">En proceso</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-amber-400">{stats.in_review}</p>
                            <p className="text-xs text-zinc-400 mt-1">En revisión</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-green-400">{stats.approved_week}</p>
                            <p className="text-xs text-zinc-400 mt-1">Aprobados (7d)</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Pendientes */}
                {pending.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
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
                        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
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
                        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
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
                        <p className="text-lg font-medium text-zinc-300">Todo al día</p>
                        <p className="text-sm text-zinc-500 mt-1">No tenés tareas asignadas en este momento.</p>
                    </div>
                )}
            </div>
        </>
    );
}
