import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    ExternalLink,
    FilePlus,
    UserCheck,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { PriorityBadge } from '@/components/priority-badge';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import * as briefRoutes from '@/routes/pm/brief';
import * as reviewRoutes from '@/routes/pm/review';
import type { Client, ContentPiece, Editor } from '@/types';

type Props = {
    reviewQueue: ContentPiece[];
    briefQueue: ContentPiece[];
    clients: Client[];
    editors: Editor[];
};

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDeadline(deadline: string | null) {
    if (!deadline) return null;
    const diff = Math.ceil(
        (new Date(deadline).getTime() - Date.now()) / 86400000,
    );
    if (diff < 0) return { label: `Vencido ${Math.abs(diff)}d`, urgent: true };
    if (diff === 0) return { label: 'Hoy', urgent: true };
    if (diff === 1) return { label: 'Mañana', urgent: true };
    return { label: `${diff}d`, urgent: false };
}

// ─── Assign editor modal ─────────────────────────────────────────────────────

function AssignEditorModal({
    piece,
    editors,
    open,
    onClose,
}: {
    piece: ContentPiece;
    editors: Editor[];
    open: boolean;
    onClose: () => void;
}) {
    const { data, setData, post, processing } = useForm({ editor_id: '' });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(briefRoutes.assign.url(piece.id), {
            onSuccess: onClose,
        });
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Asignar editor</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    {piece.client?.name} —{' '}
                    {piece.concept ?? piece.product ?? 'Sin concepto'}
                </p>
                <form
                    id="assign-form"
                    onSubmit={submit}
                    className="space-y-3 pt-1"
                >
                    <div className="space-y-1.5">
                        <Label>Editor</Label>
                        <Select
                            value={data.editor_id}
                            onValueChange={(v) => setData('editor_id', v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Elegí un editor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {editors.map((e) => (
                                    <SelectItem key={e.id} value={String(e.id)}>
                                        {e.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </form>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="assign-form"
                        disabled={processing || !data.editor_id}
                    >
                        <UserCheck className="mr-1.5 h-4 w-4" />
                        Asignar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── New brief modal ─────────────────────────────────────────────────────────

function NewBriefModal({
    clients,
    editors,
    open,
    onClose,
}: {
    clients: Client[];
    editors: Editor[];
    open: boolean;
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        client_id: '',
        concept: '',
        product: '',
        category: '',
        objective: '',
        hook: '',
        development: '',
        cta: '',
        brief_notes: '',
        raw_material_link: '',
        priority: '3',
        deadline: '',
        editor_id: '',
        is_scheduled: false,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(briefRoutes.store.url(), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    }

    function field(
        label: string,
        key: keyof typeof data,
        opts?: { type?: string; placeholder?: string; textarea?: boolean },
    ) {
        return (
            <div className="space-y-1.5">
                <Label>{label}</Label>
                {opts?.textarea ? (
                    <textarea
                        className="min-h-[72px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                        value={data[key] as string}
                        onChange={(e) => setData(key, e.target.value)}
                        placeholder={opts.placeholder}
                    />
                ) : (
                    <Input
                        type={opts?.type ?? 'text'}
                        value={data[key] as string}
                        onChange={(e) => setData(key, e.target.value)}
                        placeholder={opts?.placeholder}
                    />
                )}
                {errors[key] && (
                    <p className="text-xs text-destructive">{errors[key]}</p>
                )}
            </div>
        );
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FilePlus className="h-5 w-5" />
                        Nuevo brief
                    </DialogTitle>
                </DialogHeader>

                <form id="brief-form" onSubmit={submit} className="space-y-4">
                    {/* Cliente + prioridad */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>
                                Cliente{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={data.client_id}
                                onValueChange={(v) => setData('client_id', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccioná un cliente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((c) => (
                                        <SelectItem
                                            key={c.id}
                                            value={String(c.id)}
                                        >
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.client_id && (
                                <p className="text-xs text-destructive">
                                    {errors.client_id}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Prioridad</Label>
                            <Select
                                value={data.priority}
                                onValueChange={(v) => setData('priority', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">
                                        🔴 Crítico
                                    </SelectItem>
                                    <SelectItem value="2">🟠 Alto</SelectItem>
                                    <SelectItem value="3">🟡 Medio</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Concepto + producto */}
                    <div className="grid grid-cols-2 gap-3">
                        {field('Concepto creativo', 'concept', {
                            placeholder: 'Ej: Lanzamiento Cold Brew...',
                        })}
                        {field('Producto / servicio', 'product', {
                            placeholder: 'Ej: Cold Brew 24hs',
                        })}
                    </div>

                    {/* Categoría + deadline */}
                    <div className="grid grid-cols-2 gap-3">
                        {field('Categoría', 'category', {
                            placeholder: 'Ej: Lanzamiento, Retención...',
                        })}
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Deadline
                            </Label>
                            <Input
                                type="datetime-local"
                                value={data.deadline}
                                onChange={(e) =>
                                    setData('deadline', e.target.value)
                                }
                            />
                        </div>
                    </div>

                    {field('Objetivo de campaña', 'objective', {
                        textarea: true,
                        placeholder:
                            'Qué queremos lograr con este contenido...',
                    })}
                    {field('Hook visual del video', 'hook', {
                        textarea: true,
                        placeholder: 'Descripción de cómo arranca el video...',
                    })}
                    {field('Desarrollo del contenido', 'development', {
                        textarea: true,
                        placeholder: 'Cómo se desarrolla la historia...',
                    })}

                    {/* CTA + editor */}
                    <div className="grid grid-cols-2 gap-3">
                        {field('CTA', 'cta', {
                            placeholder: 'Ej: Pedí el tuyo en...',
                        })}
                        <div className="space-y-1.5">
                            <Label>Asignar editor (opcional)</Label>
                            <Select
                                value={data.editor_id}
                                onValueChange={(v) => setData('editor_id', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sin asignar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">
                                        Sin asignar
                                    </SelectItem>
                                    {editors.map((e) => (
                                        <SelectItem
                                            key={e.id}
                                            value={String(e.id)}
                                        >
                                            {e.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {field('Material de referencia (link)', 'raw_material_link', { type: 'url', placeholder: 'https://drive.google.com/...' })}

                    {field('Notas para el editor', 'brief_notes', { textarea: true, placeholder: 'Instrucciones adicionales...' })}
                </form>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="brief-form"
                        disabled={processing || !data.client_id}
                    >
                        <FilePlus className="mr-1.5 h-4 w-4" />
                        {processing ? 'Creando...' : 'Crear brief'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Brief queue card ────────────────────────────────────────────────────────

function BriefCard({
    piece,
    editors,
}: {
    piece: ContentPiece;
    editors: Editor[];
}) {
    const [assignOpen, setAssignOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const deadline = fmtDeadline(piece.deadline);

    return (
        <>
            <Card className="border-zinc-800 bg-zinc-900">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                                    {piece.client?.name}
                                </span>
                                <StatusBadge status={piece.status} />
                                <PriorityBadge priority={piece.priority} />
                                {deadline && (
                                    <span
                                        className={`flex items-center gap-1 text-xs ${deadline.urgent ? 'text-red-400' : 'text-zinc-400'}`}
                                    >
                                        <Clock className="h-3 w-3" />
                                        {deadline.label}
                                    </span>
                                )}
                            </div>
                            <p className="truncate font-medium text-zinc-100">
                                {piece.concept ??
                                    piece.product ??
                                    'Sin concepto'}
                            </p>
                            {piece.editor && (
                                <p className="mt-0.5 text-xs text-zinc-500">
                                    Editor: {piece.editor.name}
                                </p>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            {!piece.assigned_editor_id && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAssignOpen(true)}
                                >
                                    <UserCheck className="mr-1 h-3.5 w-3.5" />
                                    Asignar
                                </Button>
                            )}
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-zinc-400 transition-colors hover:text-zinc-200"
                            >
                                {expanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {expanded && (
                        <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3 text-sm text-zinc-300">
                            {piece.objective && (
                                <div>
                                    <span className="text-xs tracking-wide text-zinc-500 uppercase">
                                        Objetivo
                                    </span>
                                    <p>{piece.objective}</p>
                                </div>
                            )}
                            {piece.hook && (
                                <div>
                                    <span className="text-xs tracking-wide text-zinc-500 uppercase">
                                        Hook
                                    </span>
                                    <p>{piece.hook}</p>
                                </div>
                            )}
                            {piece.cta && (
                                <div>
                                    <span className="text-xs tracking-wide text-zinc-500 uppercase">
                                        CTA
                                    </span>
                                    <p>{piece.cta}</p>
                                </div>
                            )}
                            {piece.brief_notes && (
                                <div className="rounded bg-zinc-800 p-2 text-xs text-zinc-400">
                                    <AlertCircle className="mr-1 inline h-3 w-3" />
                                    {piece.brief_notes}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {assignOpen && (
                <AssignEditorModal
                    piece={piece}
                    editors={editors}
                    open={assignOpen}
                    onClose={() => setAssignOpen(false)}
                />
            )}
        </>
    );
}

// ─── Review queue card ───────────────────────────────────────────────────────

function ReviewCard({ piece }: { piece: ContentPiece }) {
    const deadline = fmtDeadline(piece.deadline);

    return (
        <Card className="border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-600">
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                                {piece.client?.name}
                            </span>
                            <PriorityBadge priority={piece.priority} />
                            {deadline && (
                                <span
                                    className={`flex items-center gap-1 text-xs ${deadline.urgent ? 'text-red-400' : 'text-zinc-400'}`}
                                >
                                    <Clock className="h-3 w-3" />
                                    {deadline.label}
                                </span>
                            )}
                        </div>
                        <p className="truncate font-medium text-zinc-100">
                            {piece.concept ?? piece.product ?? 'Sin concepto'}
                        </p>
                        {piece.editor && (
                            <p className="mt-0.5 text-xs text-zinc-500">
                                por {piece.editor.name}
                            </p>
                        )}
                        {piece.final_video_link && (
                            <a
                                href={piece.final_video_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                            >
                                <ExternalLink className="h-3 w-3" />
                                Ver video
                            </a>
                        )}
                    </div>
                    <Link href={reviewRoutes.show.url(piece.id)}>
                        <Button size="sm">
                            Revisar
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PmDashboard({
    reviewQueue,
    briefQueue,
    clients,
    editors,
}: Props) {
    const [briefOpen, setBriefOpen] = useState(false);

    const clientReview = briefQueue.filter((p) =>
        ['CLIENT_REVIEW', 'CLIENT_REVISION', 'PM_APPROVED'].includes(p.status),
    );
    const inProgress = briefQueue.filter((p) =>
        ['BRIEF', 'EDITING', 'REVISION'].includes(p.status),
    );

    return (
        <>
            <Head title="Dashboard PM" />

            <div className="space-y-8 px-4 py-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100">
                            Dashboard PM
                        </h1>
                        <p className="mt-0.5 text-zinc-400">
                            {reviewQueue.length} para revisar ·{' '}
                            {inProgress.length} en proceso
                        </p>
                    </div>
                    <Button onClick={() => setBriefOpen(true)}>
                        <FilePlus className="mr-2 h-4 w-4" />
                        Nuevo brief
                    </Button>
                </div>

                {/* Cola de revisión */}
                {reviewQueue.length > 0 && (
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold tracking-wider text-amber-400 uppercase">
                                Para revisar
                            </h2>
                            <Badge className="border-amber-500/30 bg-amber-500/20 text-amber-400">
                                {reviewQueue.length}
                            </Badge>
                        </div>
                        {reviewQueue.map((p) => (
                            <ReviewCard key={p.id} piece={p} />
                        ))}
                    </section>
                )}

                {/* En proceso */}
                {inProgress.length > 0 && (
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">
                                En proceso
                            </h2>
                            <Badge className="bg-zinc-700 text-zinc-300">
                                {inProgress.length}
                            </Badge>
                        </div>
                        {inProgress.map((p) => (
                            <BriefCard key={p.id} piece={p} editors={editors} />
                        ))}
                    </section>
                )}

                {/* Con el cliente */}
                {clientReview.length > 0 && (
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold tracking-wider text-purple-400 uppercase">
                                Con el cliente
                            </h2>
                            <Badge className="border-purple-500/30 bg-purple-500/20 text-purple-400">
                                {clientReview.length}
                            </Badge>
                        </div>
                        {clientReview.map((p) => (
                            <BriefCard key={p.id} piece={p} editors={editors} />
                        ))}
                    </section>
                )}

                {reviewQueue.length === 0 && briefQueue.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="text-lg font-medium text-zinc-300">
                            Todo tranquilo por acá
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                            No hay piezas activas.
                        </p>
                        <Button
                            className="mt-4"
                            onClick={() => setBriefOpen(true)}
                        >
                            <FilePlus className="mr-2 h-4 w-4" />
                            Crear el primer brief
                        </Button>
                    </div>
                )}
            </div>

            <NewBriefModal
                clients={clients}
                editors={editors}
                open={briefOpen}
                onClose={() => setBriefOpen(false)}
            />
        </>
    );
}
