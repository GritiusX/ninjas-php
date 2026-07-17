import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    ClipboardPaste,
    Copy,
    ExternalLink,
    Info,
    Loader2,
    MessageCircle,
    MessageSquare,
    Save,
    Sparkles,
    ThumbsUp,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { CopyPublicReviewLink, publicReviewUrl } from '@/components/copy-public-review-link';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import * as pmRoutes from '@/routes/pm';
import * as reviewRoutes from '@/routes/pm/review';
import type { ContentPiece } from '@/types';

type GeminiUsage = {
    monthly_tokens: number;
    monthly_limit: number;
    piece_generates: number;
};

type Props = { piece: ContentPiece; geminiUsage: GeminiUsage };

// ─── WhatsApp ────────────────────────────────────────────────────────────────

function buildWhatsAppMessage(piece: ContentPiece): string {
    const client = piece.client?.name ?? 'su marca';
    const title  = piece.concept ?? piece.product ?? 'el contenido';
    let msg = `Hola, les escribimos desde Little Ninjas.\n\nYa esta listo el contenido de ${client}: "${title}".\n\nQuedamos atentos al feedback.`;
    if (piece.review_token) {
        msg += `\n\nRevisen y aprueben aca: ${publicReviewUrl(piece.review_token)}`;
    }
    return msg;
}

function buildWhatsAppUrl(piece: ContentPiece): string {
    const number = piece.client!.whatsapp_number!.replace(/\D/g, '');
    return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage(piece))}`;
}

// ─── Copy panel ──────────────────────────────────────────────────────────────

type CopyVariants = { directo: string; storytelling: string; educativo: string };
type CopyKey = 'directo' | 'storytelling' | 'educativo';

const COPY_LABELS: Record<CopyKey, string> = {
    directo: 'Directo',
    storytelling: 'Storytelling',
    educativo: 'Educativo',
};

function TokenUsageBar({ usage }: { usage: GeminiUsage }) {
    const pct = Math.min((usage.monthly_tokens / usage.monthly_limit) * 100, 100);
    const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-blue-500';
    const fmt = (n: number) => n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(2)}M`
        : n >= 1_000
        ? `${(n / 1_000).toFixed(1)}k`
        : `${n}`;

    return (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Tokens IA este mes</span>
                <span className="text-muted-foreground tabular-nums">
                    {fmt(usage.monthly_tokens)} / {fmt(usage.monthly_limit)}
                </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            {pct >= 90 && (
                <p className="text-xs text-red-500 font-medium">
                    Límite casi alcanzado. Usá el botón de generar solo cuando sea necesario.
                </p>
            )}
        </div>
    );
}

function CopyPanel({
    piece,
    selectedCopy,
    setSelectedCopy,
    geminiUsage,
}: {
    piece: ContentPiece;
    selectedCopy: CopyKey | null;
    setSelectedCopy: (v: CopyKey | null) => void;
    geminiUsage: GeminiUsage;
}) {
    const { flash } = usePage<{ flash: { error?: string } }>().props;
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedOk, setSavedOk] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [manualText, setManualText] = useState('');
    const [savingManual, setSavingManual] = useState(false);

    useEffect(() => {
        if (flash?.error?.includes('Límite de requests')) setCooldown(60);
    }, [flash]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);
    const [drafts, setDrafts] = useState<CopyVariants>(() => ({
        directo:      piece.generated_copy?.directo      ?? '',
        storytelling: piece.generated_copy?.storytelling ?? '',
        educativo:    piece.generated_copy?.educativo    ?? '',
    }));
    const isDirty = useRef(false);

    useEffect(() => {
        if (!piece.generated_copy) return;
        setDrafts({
            directo:      piece.generated_copy.directo,
            storytelling: piece.generated_copy.storytelling,
            educativo:    piece.generated_copy.educativo,
        });
        isDirty.current = false;
    }, [piece.generated_copy]);

    function generate() {
        setGenerating(true);
        router.post(reviewRoutes.generateCopy.url(piece.id), {}, {
            onFinish: () => setGenerating(false),
            preserveScroll: true,
        });
    }

    function saveCopy() {
        setSaving(true);
        router.patch(`/pm/review/${piece.id}/copy`, drafts, {
            preserveScroll: true,
            onSuccess: () => {
                isDirty.current = false;
                setSavedOk(true);
                setTimeout(() => setSavedOk(false), 2000);
            },
            onFinish: () => setSaving(false),
        });
    }

    function updateDraft(variant: CopyKey, value: string) {
        isDirty.current = true;
        setDrafts((prev) => ({ ...prev, [variant]: value }));
    }

    function saveManual() {
        if (!manualText.trim()) return;
        setSavingManual(true);
        router.patch(
            `/pm/review/${piece.id}/copy`,
            { directo: manualText, storytelling: '', educativo: '' },
            {
                preserveScroll: true,
                onSuccess: () => setManualText(''),
                onFinish: () => setSavingManual(false),
            },
        );
    }

    const hasCopy = !!piece.generated_copy;
    const overLimit = geminiUsage.monthly_tokens >= geminiUsage.monthly_limit;

    return (
        <div className="space-y-4">
            <TokenUsageBar usage={geminiUsage} />

            {/* Manual copy input */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                    <ClipboardPaste className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Copy externo
                    </p>
                </div>
                <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none min-h-[80px]"
                    placeholder="Pegá acá el copy generado fuera de la plataforma..."
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    rows={3}
                />
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={saveManual}
                    disabled={savingManual || !manualText.trim()}
                >
                    {savingManual ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Guardar copy
                </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">o generá con IA</span>
                <div className="flex-1 border-t border-border" />
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-foreground">Copy con IA</h3>
                    {geminiUsage.piece_generates > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Generado {geminiUsage.piece_generates} {geminiUsage.piece_generates === 1 ? 'vez' : 'veces'} este mes
                        </p>
                    )}
                </div>
                <Button
                    size="sm"
                    variant={hasCopy ? 'outline' : 'default'}
                    onClick={generate}
                    disabled={generating || overLimit || cooldown > 0}
                    title={overLimit ? 'Límite mensual de tokens alcanzado' : cooldown > 0 ? `Esperá ${cooldown}s` : undefined}
                >
                    {generating ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {cooldown > 0 ? `Esperá ${cooldown}s` : hasCopy ? 'Regenerar' : 'Generar con IA'}
                </Button>
            </div>

            {!hasCopy && !generating && (
                <p className="text-xs text-muted-foreground text-center pb-1">
                    Genera 3 variantes de copy (directo, storytelling, educativo).
                </p>
            )}

            {hasCopy && (
                <div className="space-y-3">
                    {(['directo', 'storytelling', 'educativo'] as const).map((variant) => {
                        const isSelected = selectedCopy === variant;
                        return (
                            <div
                                key={variant}
                                className={`rounded-lg border p-4 transition-colors ${
                                    isSelected
                                        ? 'border-green-500 bg-green-500/5 dark:bg-green-950/20'
                                        : 'border-border bg-muted'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                                        isSelected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                                    }`}>
                                        {COPY_LABELS[variant]}
                                        {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCopy(isSelected ? null : variant)}
                                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                                            isSelected
                                                ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'
                                                : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {isSelected ? 'Seleccionado' : 'Seleccionar'}
                                    </button>
                                </div>
                                <textarea
                                    className="w-full bg-transparent text-sm text-foreground leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-ring rounded px-1 py-0.5 min-h-[60px]"
                                    value={drafts[variant]}
                                    onChange={(e) => updateDraft(variant, e.target.value)}
                                    rows={3}
                                />
                            </div>
                        );
                    })}

                    <div className="flex items-center justify-end gap-2 pt-1">
                        {savedOk && (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Guardado
                            </span>
                        )}
                        <Button size="sm" variant="outline" onClick={saveCopy} disabled={saving}>
                            {saving ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Guardar cambios
                        </Button>
                    </div>
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

export default function ReviewRoom({ piece, geminiUsage }: Props) {
    const { flash } = usePage<{ flash: { approved?: boolean } }>().props;
    const [changesOpen, setChangesOpen] = useState(false);
    const [approvedOpen, setApprovedOpen] = useState(false);
    const [selectedCopy, setSelectedCopy] = useState<CopyKey | null>(null);
    const [whatsappInput, setWhatsappInput] = useState('');
    const [whatsappSaving, setWhatsappSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [waMsgCopied, setWaMsgCopied] = useState(false);

    useEffect(() => {
        if (flash?.approved) setApprovedOpen(true);
    }, [flash?.approved]);

    function approve() {
        router.post(reviewRoutes.approve.url(piece.id), { selected_copy: selectedCopy });
    }

    function saveWhatsapp() {
        if (!whatsappInput.trim() || !piece.client) return;
        setWhatsappSaving(true);
        router.patch(`/pm/client/${piece.client.id}/whatsapp`, { whatsapp_number: whatsappInput }, {
            onFinish: () => setWhatsappSaving(false),
        });
    }

    function copyLink() {
        if (!piece.review_token) return;
        navigator.clipboard.writeText(publicReviewUrl(piece.review_token));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function copyWaMessage() {
        navigator.clipboard.writeText(buildWhatsAppMessage(piece));
        setWaMsgCopied(true);
        setTimeout(() => setWaMsgCopied(false), 2000);
    }

    const hasWhatsapp = !!piece.client?.whatsapp_number;
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

                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-xl font-bold text-foreground">
                            {piece.client?.name}
                        </h1>
                        <StatusBadge status={piece.status} />
                        {piece.editor && (
                            <span className="text-sm text-muted-foreground">por {piece.editor.name}</span>
                        )}
                    </div>

                    {piece.client && (
                        <div className="flex items-center gap-2">
                            <CopyPublicReviewLink token={piece.review_token} variant="button" />
                        </div>
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
                                        <video
                                            src={
                                                piece.final_video_link.includes('drive.google.com')
                                                    ? `/pm/review/${piece.id}/stream-video`
                                                    : piece.final_video_link
                                            }
                                            controls
                                            className="w-full rounded-lg border border-border"
                                            preload="metadata"
                                        />
                                        {piece.final_video_link.includes('drive.google.com') && (
                                            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                El video se transmite desde Google Drive a través del servidor. Si es muy pesado puede tardar unos segundos en cargar o en responder al seek.
                                            </p>
                                        )}
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
                                <CopyPanel
                                    piece={piece}
                                    selectedCopy={selectedCopy}
                                    setSelectedCopy={setSelectedCopy}
                                    geminiUsage={geminiUsage}
                                />
                            </CardContent>
                        </Card>

                        {/* WhatsApp message preview */}
                        {piece.review_token && (
                            <Card className="bg-card border-border">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-foreground flex items-center gap-2">
                                        <MessageCircle className="h-4 w-4 text-green-500" />
                                        Mensaje para el cliente
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans bg-muted rounded-lg p-3 border border-border">
                                        {buildWhatsAppMessage(piece)}
                                    </pre>
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" onClick={copyWaMessage}>
                                            {waMsgCopied ? (
                                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                                            ) : (
                                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                            )}
                                            {waMsgCopied ? 'Copiado' : 'Copiar mensaje'}
                                        </Button>
                                        {hasWhatsapp && (
                                            <a href={buildWhatsAppUrl(piece)} target="_blank" rel="noopener noreferrer">
                                                <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white">
                                                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                                                    Abrir WhatsApp
                                                </Button>
                                            </a>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Actions */}
                        {(canApprove || canRequestChanges) && (
                            <Card className="bg-card border-border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base text-foreground">Decision</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {canApprove && piece.generated_copy && (
                                        <div>
                                            {selectedCopy ? (
                                                <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Version seleccionada: {COPY_LABELS[selectedCopy]}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    Selecciona una version de copy arriba antes de aprobar.
                                                </p>
                                            )}
                                        </div>
                                    )}
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

            <Dialog open={approvedOpen} onOpenChange={setApprovedOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                    {/* Hero */}
                    <div className="bg-green-500/10 border-b border-green-500/20 px-6 pt-8 pb-6 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 ring-4 ring-green-500/10">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">¡Pieza aprobada!</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {piece.client?.name} — {piece.concept ?? piece.product ?? 'Lista para el cliente'}
                        </p>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        {/* Link de revisión */}
                        {piece.review_token && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Link para el cliente
                                </p>
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2 pl-3">
                                    <span className="flex-1 truncate text-xs text-foreground font-mono">
                                        {publicReviewUrl(piece.review_token)}
                                    </span>
                                    <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1.5 text-xs" onClick={copyLink}>
                                        {copied
                                            ? <><CheckCircle2 className="h-3 w-3 text-green-500" /> Copiado</>
                                            : <><Copy className="h-3 w-3" /> Copiar</>
                                        }
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* WhatsApp */}
                        {piece.client?.whatsapp_number ? (
                            <div className="rounded-lg border border-green-500/25 bg-green-500/8 p-4 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20">
                                        <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">WhatsApp listo para enviar</p>
                                        <p className="text-xs text-muted-foreground">{piece.client.whatsapp_number}</p>
                                    </div>
                                </div>
                                {piece.review_token && (
                                    <a
                                        href={buildWhatsAppUrl(piece)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 hover:bg-green-500 px-3 py-2 text-xs font-semibold text-white transition-colors"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        Abrir WhatsApp y enviar
                                        <ExternalLink className="h-3 w-3 opacity-70" />
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
                                <p className="text-xs text-muted-foreground text-center">
                                    Sin número de WhatsApp — agregalo para contactar al cliente
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="+54 9 11 1234-5678"
                                        value={whatsappInput}
                                        onChange={(e) => setWhatsappInput(e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                    <Button
                                        size="sm"
                                        className="h-8 shrink-0"
                                        disabled={!whatsappInput.trim() || whatsappSaving}
                                        onClick={saveWhatsapp}
                                    >
                                        {whatsappSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4 bg-muted/30">
                        <Button variant="ghost" size="sm" onClick={() => setApprovedOpen(false)}>
                            Cerrar
                        </Button>
                        <Link href="/pm">
                            <Button size="sm">Ir al dashboard</Button>
                        </Link>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
