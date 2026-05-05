import { Head, useForm, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Clock, ExternalLink, Film, Send } from 'lucide-react';
import { useState } from 'react';
import { PriorityBadge } from '@/components/priority-badge';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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

function SubmitVideoModal({
    piece,
    open,
    onClose,
}: {
    piece: ContentPiece;
    open: boolean;
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        final_video_link: piece.final_video_link ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(editorRoutes.submitVideo.url(piece.id), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Subir link del video</DialogTitle>
                </DialogHeader>
                <div className="py-1">
                    <p className="text-sm text-muted-foreground mb-4">
                        <span className="font-medium text-foreground">{piece.client?.name}</span>
                        {piece.concept && <> — {piece.concept}</>}
                    </p>
                    <form id="submit-video-form" onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="video-link">Link de Google Drive</Label>
                            <Input
                                id="video-link"
                                type="url"
                                placeholder="https://drive.google.com/file/d/..."
                                value={data.final_video_link}
                                onChange={(e) => setData('final_video_link', e.target.value)}
                                autoFocus
                            />
                            {errors.final_video_link && (
                                <p className="text-sm text-destructive">{errors.final_video_link}</p>
                            )}
                        </div>
                    </form>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="submit-video-form" disabled={processing}>
                        <Send className="mr-2 h-4 w-4" />
                        {processing ? 'Enviando...' : 'Enviar para revisión'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PieceCard({ piece }: { piece: ContentPiece }) {
    const [modalOpen, setModalOpen] = useState(false);
    const deadline = formatDeadline(piece.deadline);
    const canSubmit = piece.status === 'EDITING' || piece.status === 'REVISION';

    return (
        <>
            <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
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

                        {canSubmit && (
                            <Button
                                size="sm"
                                onClick={() => setModalOpen(true)}
                                className="shrink-0"
                            >
                                <Film className="mr-1.5 h-3.5 w-3.5" />
                                {piece.final_video_link ? 'Actualizar' : 'Subir video'}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {modalOpen && (
                <SubmitVideoModal
                    piece={piece}
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                />
            )}
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
                        {pending.map((piece) => (
                            <PieceCard key={piece.id} piece={piece} />
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
