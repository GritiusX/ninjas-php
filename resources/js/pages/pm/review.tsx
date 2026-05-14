import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    ExternalLink,
    Loader2,
    MessageSquare,
    Sparkles,
    ThumbsUp,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { PriorityBadge } from '@/components/priority-badge';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import * as pmRoutes from '@/routes/pm';
import * as reviewRoutes from '@/routes/pm/review';
import type { ContentPiece } from '@/types';

type Props = { piece: ContentPiece };

// ─── Copy panel ──────────────────────────────────────────────────────────────

function CopyPanel({ piece }: { piece: ContentPiece }) {
    const [generating, setGenerating] = useState(false);

    function generate() {
        setGenerating(true);
        router.post(
            reviewRoutes.generateCopy.url(piece.id),
            {},
            {
                onFinish: () => setGenerating(false),
                preserveScroll: true,
            },
        );
    }

    const copy = piece.generated_copy;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Copy generado</h3>
                <Button
                    size="sm"
                    variant={copy ? 'outline' : 'default'}
                    onClick={generate}
                    disabled={generating}
                >
                    {generating ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {copy ? 'Regenerar' : 'Generar con IA'}
                </Button>
            </div>

            {!copy && !generating && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Hacé clic en "Generar con IA" para crear 3 variantes de copy con Gemini.
                    </p>
                </div>
            )}

            {copy && (
                <div className="space-y-3">
                    {(['directo', 'storytelling', 'educativo'] as const).map((variant) => (
                        <div key={variant} className="rounded-lg bg-muted border border-border p-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 capitalize">
                                {variant}
                            </p>
                            <p className="text-sm text-foreground leading-relaxed">{copy[variant]}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Request changes modal ───────────────────────────────────────────────────

function RequestChangesModal({
    piece,
    open,
    onClose,
}: {
    piece: ContentPiece;
    open: boolean;
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors } = useForm({ comments: '' });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(reviewRoutes.requestChanges.url(piece.id), { onSuccess: onClose });
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <h3 className="font-semibold text-foreground">Pedir cambios</h3>
                </div>
                <form onSubmit={submit} className="space-y-3">
                    <div className="space-y-1.5">
                        <Label>Comentarios para el editor</Label>
                        <textarea
                            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[100px] resize-y"
                            value={data.comments}
                            onChange={(e) => setData('comments', e.target.value)}
                            placeholder="Qué necesita cambiar el editor..."
                            autoFocus
                        />
                        {errors.comments && <p className="text-xs text-destructive">{errors.comments}</p>}
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                        <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={processing || !data.comments.trim()}
                        >
                            <XCircle className="mr-1.5 h-4 w-4" />
                            Enviar al editor
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReviewRoom({ piece }: Props) {
    const [changesOpen, setChangesOpen] = useState(false);

    function approve() {
        router.post(reviewRoutes.approve.url(piece.id));
    }

    const canApprove = piece.status === 'INTERNAL_REVIEW';
    const canRequestChanges = piece.status === 'INTERNAL_REVIEW';

    return (
        <>
            <Head title={`Revisar — ${piece.client?.name}`} />

            <div className="mx-auto max-w-6xl px-4 py-6">
                {/* Back + header */}
                <div className="mb-6 flex items-start gap-4">
                    <Link href={pmRoutes.dashboard()}>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Dashboard
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <h1 className="text-xl font-bold text-foreground">
                        {piece.client?.name}
                    </h1>
                    <StatusBadge status={piece.status} />
                    <PriorityBadge priority={piece.priority} />
                    {piece.editor && (
                        <span className="text-sm text-muted-foreground">por {piece.editor.name}</span>
                    )}
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Video + brief — left (3 cols) */}
                    <div className="lg:col-span-3 space-y-5">
                        {/* Video embed */}
                        <Card className="bg-card border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base text-foreground">Video final</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {piece.final_video_link ? (
                                    <div className="space-y-3">
                                        <div className="aspect-video rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden">
                                            {piece.final_video_link.includes('drive.google.com') ? (
                                                <iframe
                                                    src={piece.final_video_link.replace('/view', '/preview')}
                                                    className="w-full h-full rounded-lg"
                                                    allow="autoplay"
                                                    allowFullScreen
                                                />
                                            ) : (
                                                <video
                                                    src={piece.final_video_link}
                                                    controls
                                                    className="w-full h-full rounded-lg"
                                                />
                                            )}
                                        </div>
                                        <a
                                            href={piece.final_video_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Abrir en Drive
                                        </a>
                                    </div>
                                ) : (
                                    <div className="aspect-video rounded-lg bg-muted border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
                                        <AlertCircle className="h-8 w-8 mb-2" />
                                        <p className="text-sm">El editor aún no subió el video</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Brief detail */}
                        <Card className="bg-card border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base text-foreground">Brief</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {[
                                    { label: 'Concepto', value: piece.concept },
                                    { label: 'Producto', value: piece.product },
                                    { label: 'Categoría', value: piece.category },
                                    { label: 'Objetivo', value: piece.objective },
                                    { label: 'Hook visual', value: piece.hook },
                                    { label: 'Desarrollo', value: piece.development },
                                    { label: 'CTA', value: piece.cta },
                                    { label: 'Notas', value: piece.brief_notes },
                                ]
                                    .filter((f) => f.value)
                                    .map((f) => (
                                        <div key={f.label}>
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                                                {f.label}
                                            </p>
                                            <p className="text-foreground">{f.value}</p>
                                        </div>
                                    ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Copy + actions — right (2 cols) */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Copy panel */}
                        <Card className="bg-card border-border">
                            <CardContent className="pt-5">
                                <CopyPanel piece={piece} />
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        {(canApprove || canRequestChanges) && (
                            <Card className="bg-card border-border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base text-foreground">Decisión</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {canApprove && (
                                        <Button
                                            className="w-full bg-green-600 hover:bg-green-500 text-white"
                                            onClick={approve}
                                        >
                                            <ThumbsUp className="mr-2 h-4 w-4" />
                                            Aprobar internamente
                                        </Button>
                                    )}
                                    {canRequestChanges && (
                                        <Button
                                            variant="outline"
                                            className="w-full border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950"
                                            onClick={() => setChangesOpen(true)}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Pedir cambios al editor
                                        </Button>
                                    )}
                                    <p className="text-xs text-muted-foreground text-center">
                                        Al aprobar, el sistema enviará el video y el copy al cliente por WhatsApp.
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Client feedback (if exists) */}
                        {piece.client_feedback && (
                            <Card className="bg-card border-orange-200 dark:border-orange-800/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        Respuesta del cliente
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-foreground">{piece.client_feedback}</p>
                                    {piece.status === 'CLIENT_REVIEW' && (
                                        <Button
                                            size="sm"
                                            className="mt-3 w-full bg-green-600 hover:bg-green-500"
                                            onClick={() => router.post(reviewRoutes.approveClient.url(piece.id))}
                                        >
                                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                            Marcar como aprobado
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            <RequestChangesModal
                piece={piece}
                open={changesOpen}
                onClose={() => setChangesOpen(false)}
            />
        </>
    );
}
