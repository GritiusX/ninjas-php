import { Head, Link, useForm } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, Clock, ExternalLink, Link2, Send, Target, BookOpen, MessageSquare, Megaphone } from 'lucide-react';
import { PriorityBadge } from '@/components/priority-badge';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    const { data, setData, post, processing, errors } = useForm({
        final_video_link: piece.final_video_link ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(editorRoutes.submitVideo.url(piece.id));
    }

    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
                <Label htmlFor="video-link">URL del video en Drive</Label>
                <Input
                    id="video-link"
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={data.final_video_link}
                    onChange={(e) => setData('final_video_link', e.target.value)}
                />
                {errors.final_video_link && (
                    <p className="text-sm text-destructive">{errors.final_video_link}</p>
                )}
            </div>
            <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                <Send className="mr-2 h-4 w-4" />
                {processing ? 'Enviando...' : 'Enviar para revisión'}
            </Button>
        </form>
    );
}

export default function EditorTask({ piece }: Props) {
    const deadline = formatDeadline(piece.deadline);
    const canSubmit = piece.status === 'EDITING' || piece.status === 'REVISION';

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
                            <PriorityBadge priority={piece.priority} />
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
                            Subir video editado
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
