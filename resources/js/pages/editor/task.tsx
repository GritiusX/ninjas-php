import { Head, Link, router, useForm } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, ExternalLink, Link2, Send, Target, BookOpen, MessageSquare, Megaphone, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import * as editorRoutes from '@/routes/editor';
import type { ContentPiece } from '@/types';

type Props = {
    piece: ContentPiece;
};

function formatDeadline(deadline: string | null) {
    if (!deadline) return null;
    const date = new Date(deadline);
    const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000);
    if (diffDays < 0) return { label: `Vencido hace ${Math.abs(diffDays)}d`, urgent: true };
    if (diffDays === 0) return { label: 'Hoy', urgent: true };
    if (diffDays === 1) return { label: 'Mañana', urgent: true };
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return { label: `${d}/${m}`, urgent: false };
}

function SubmitVideoForm({ piece }: { piece: ContentPiece }) {
    const { data, setData, post, processing, progress, errors } = useForm<{ video: File | null }>({
        video: null,
    });
    const [submitted, setSubmitted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const isUpdate = piece.status === 'INTERNAL_REVIEW';

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(editorRoutes.submitVideo.url(piece.id), {
            forceFormData: true,
            onSuccess: () => setSubmitted(true),
        });
    }

    const uploadPercent = progress?.percentage ?? 0;

    return (
        <>
            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Archivo de video</Label>

                    <div
                        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                        onClick={() => inputRef.current?.click()}
                    >
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        {data.video ? (
                            <div>
                                <p className="text-sm font-medium text-foreground">{data.video.name}</p>
                                <p className="text-xs text-muted-foreground">{(data.video.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm font-medium text-foreground">Hacé click para seleccionar</p>
                                <p className="text-xs text-muted-foreground">MP4 o MOV · máx 2 GB</p>
                            </div>
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        type="file"
                        accept="video/mp4,video/quicktime,video/x-msvideo"
                        className="hidden"
                        onChange={(e) => setData('video', e.target.files?.[0] ?? null)}
                    />

                    {errors.video && (
                        <p className="text-sm text-destructive">{errors.video}</p>
                    )}
                </div>

                {processing && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{uploadPercent < 100 ? 'Subiendo a Drive...' : 'Procesando...'}</span>
                            {uploadPercent < 100 && <span>{uploadPercent}%</span>}
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-300"
                                style={{ width: uploadPercent < 100 ? `${uploadPercent}%` : '100%' }}
                            />
                        </div>
                        {uploadPercent >= 100 && (
                            <p className="text-xs text-muted-foreground">Subiendo a Google Drive, no cierres esta ventana...</p>
                        )}
                    </div>
                )}

                <Button type="submit" disabled={processing || !data.video} className="w-full sm:w-auto">
                    <Send className="mr-2 h-4 w-4" />
                    {processing ? 'Subiendo...' : isUpdate ? 'Actualizar y re-enviar' : 'Subir y enviar para revisión'}
                </Button>
            </form>

            <Dialog open={submitted} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                            {isUpdate ? '¡Video actualizado!' : '¡Enviado para revisión!'}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        {isUpdate
                            ? 'El nuevo video fue subido a Drive y enviado al PM para revisión.'
                            : 'El video fue subido a Drive y enviado al PM. Te avisamos cuando haya feedback.'}
                    </p>
                    <DialogFooter>
                        <Button onClick={() => router.visit(editorRoutes.dashboard.url())}>
                            Volver a mis tareas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function EditorTask({ piece }: Props) {
    const deadline = formatDeadline(piece.deadline);
    const canSubmit = ['EDITING', 'REVISION', 'INTERNAL_REVIEW'].includes(piece.status);

    return (
        <>
            <Head title={`${piece.client?.name} · ${piece.concept ?? piece.product ?? 'Tarea'}`} />

            <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
                {/* Header */}
                <div className="space-y-3">
                    <div>
                        <Link
                            href={editorRoutes.dashboard.url()}
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Mis tareas
                        </Link>
                    </div>

                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                {piece.client?.name}
                            </p>
                            <h1 className="text-xl font-bold text-foreground leading-tight">
                                {piece.concept ?? piece.product ?? 'Sin concepto'}
                            </h1>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <StatusBadge status={piece.status} />
                            {deadline && (
                                <span className={`flex items-center gap-1 text-xs font-medium ${deadline.urgent ? 'text-red-400' : 'text-muted-foreground'}`}>
                                    <Clock className="h-3.5 w-3.5" />
                                    {deadline.label}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Brief */}
                <section className="space-y-4 rounded-xl bg-card border border-border p-5">
                    {(piece.product || piece.category) && (
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                            {[piece.product, piece.category].filter(Boolean).join(' · ')}
                        </p>
                    )}

                    {piece.objective && (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-blue-400" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objetivo</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{piece.objective}</p>
                        </div>
                    )}

                    {piece.hook && (
                        <div className="rounded-lg bg-muted border border-border p-4 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-base">🎬</span>
                                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Hook</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{piece.hook}</p>
                        </div>
                    )}

                    {piece.development && (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Desarrollo</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{piece.development}</p>
                        </div>
                    )}

                    {piece.cta && (
                        <div className="rounded-lg bg-muted border border-border p-4 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Megaphone className="h-4 w-4 text-green-400" />
                                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">CTA</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{piece.cta}</p>
                        </div>
                    )}

                    {piece.brief_notes && (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas del PM</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{piece.brief_notes}</p>
                        </div>
                    )}
                </section>

                {/* Material de referencia */}
                {(() => {
                    const links = [
                        ...(piece.raw_material_links ?? []),
                        ...(piece.raw_material_link && !piece.raw_material_links?.length ? [piece.raw_material_link] : []),
                    ].filter(Boolean);
                    if (!links.length) return null;
                    return (
                        <section className="rounded-xl bg-card border border-border p-5">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Link2 className="h-4 w-4" />
                                Material de referencia
                            </h2>
                            <div className="space-y-2">
                                {links.map((link, i) => (
                                    <a
                                        key={i}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
                                    >
                                        <ExternalLink className="h-4 w-4 shrink-0" />
                                        {links.length > 1 ? `Material ${i + 1}` : 'Abrir material'}
                                    </a>
                                ))}
                            </div>
                        </section>
                    );
                })()}

                {/* Cambios solicitados (solo si REVISION) */}
                {piece.status === 'REVISION' && piece.internal_comments && (
                    <section className="rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/50 p-5 space-y-2">
                        <h2 className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Cambios solicitados
                        </h2>
                        <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">{piece.internal_comments}</p>
                    </section>
                )}

                {/* Subir video */}
                {canSubmit && (
                    <section className="rounded-xl bg-card border border-border p-5 space-y-3">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {piece.status === 'INTERNAL_REVIEW' ? 'Actualizar video' : 'Subir video editado'}
                        </h2>
                        {piece.final_video_link && (
                            <a
                                href={piece.final_video_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Ver video subido actualmente
                            </a>
                        )}
                        <SubmitVideoForm piece={piece} />
                    </section>
                )}
            </div>
        </>
    );
}
