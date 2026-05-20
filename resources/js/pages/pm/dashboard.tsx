import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    ExternalLink,
    FilePlus,
    Pencil,
    Plus,
    Table2,
    Trash2,
    UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { PriorityBadge } from '@/components/priority-badge';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    const date = new Date(deadline);
    const diff = Math.ceil(
        (date.getTime() - Date.now()) / 86400000,
    );
    if (diff < 0) return { label: `Vencido ${Math.abs(diff)}d`, urgent: true };
    if (diff === 0) return { label: 'Hoy', urgent: true };
    if (diff === 1) return { label: 'Mañana', urgent: true };
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return { label: `${d}/${m}`, urgent: false };
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

// ─── Multi-link input ────────────────────────────────────────────────────────

function MultiLinkInput({
    links,
    onChange,
    errors,
}: {
    links: string[];
    onChange: (links: string[]) => void;
    errors?: Record<string, string>;
}) {
    function update(i: number, val: string) {
        const next = [...links];
        next[i] = val;
        onChange(next);
    }

    function add() {
        onChange([...links, '']);
    }

    function remove(i: number) {
        onChange(links.filter((_, idx) => idx !== i));
    }

    return (
        <div className="space-y-2">
            {links.map((link, i) => (
                <div key={i} className="flex gap-2">
                    <Input
                        type="url"
                        value={link}
                        onChange={(e) => update(i, e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="flex-1"
                    />
                    {links.length > 1 && (
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => remove(i)}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ))}
            {errors && Object.entries(errors)
                .filter(([k]) => k.startsWith('raw_material_links.'))
                .map(([k, v]) => (
                    <p key={k} className="text-xs text-destructive">{v}</p>
                ))}
            {links.length < 10 && (
                <Button type="button" variant="outline" size="sm" onClick={add}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Agregar link
                </Button>
            )}
        </div>
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
    const { data, setData, post, transform, processing, errors, reset } = useForm<{
        client_id: string;
        concept: string;
        product: string;
        category: string;
        objective: string;
        hook: string;
        development: string;
        cta: string;
        brief_notes: string;
        raw_material_links: string[];
        priority: string;
        deadline: string;
        editor_id: string;
        is_scheduled: boolean;
    }>({
        client_id: '',
        concept: '',
        product: '',
        category: '',
        objective: '',
        hook: '',
        development: '',
        cta: '',
        brief_notes: '',
        raw_material_links: [''],
        priority: '3',
        deadline: '',
        editor_id: 'none',
        is_scheduled: false,
    });

    transform((d) => ({
        ...d,
        editor_id: d.editor_id === 'none' ? '' : d.editor_id,
        raw_material_links: d.raw_material_links.filter((l) => l.trim() !== ''),
    }));

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
        opts?: { type?: string; placeholder?: string; textarea?: boolean; required?: boolean },
    ) {
        return (
            <div className="space-y-1.5">
                <Label>
                    {label}
                    {opts?.required && <span className="text-destructive ml-1">*</span>}
                </Label>
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

    const canSubmit = !processing && !!data.client_id && !!data.concept.trim() && !!data.deadline;

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
                                    <SelectItem value="1">🔴 Crítico</SelectItem>
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
                            required: true,
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
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="datetime-local"
                                value={data.deadline}
                                onChange={(e) =>
                                    setData('deadline', e.target.value)
                                }
                            />
                            {errors.deadline && (
                                <p className="text-xs text-destructive">{errors.deadline}</p>
                            )}
                        </div>
                    </div>

                    {field('Objetivo de campaña', 'objective', {
                        textarea: true,
                        placeholder: 'Qué queremos lograr con este contenido...',
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
                                    <SelectItem value="none">Sin asignar</SelectItem>
                                    {editors.map((e) => (
                                        <SelectItem key={e.id} value={String(e.id)}>
                                            {e.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Material de referencia - múltiples links */}
                    <div className="space-y-1.5">
                        <Label>Material de referencia</Label>
                        <MultiLinkInput
                            links={data.raw_material_links}
                            onChange={(links) => setData('raw_material_links', links)}
                            errors={errors as Record<string, string>}
                        />
                    </div>

                    {field('Notas para el editor', 'brief_notes', {
                        textarea: true,
                        placeholder: 'Instrucciones adicionales...',
                    })}
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
                        disabled={!canSubmit}
                    >
                        <FilePlus className="mr-1.5 h-4 w-4" />
                        {processing ? 'Creando...' : 'Crear brief'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Edit brief modal ────────────────────────────────────────────────────────

function EditBriefModal({
    piece,
    open,
    onClose,
}: {
    piece: ContentPiece;
    open: boolean;
    onClose: () => void;
}) {
    const toDatetimeLocal = (iso: string | null) => {
        if (!iso) return '';
        return iso.replace(' ', 'T').slice(0, 16);
    };

    const { data, setData, put, transform, processing, errors } = useForm({
        concept: piece.concept ?? '',
        product: piece.product ?? '',
        category: piece.category ?? '',
        objective: piece.objective ?? '',
        hook: piece.hook ?? '',
        development: piece.development ?? '',
        cta: piece.cta ?? '',
        brief_notes: piece.brief_notes ?? '',
        raw_material_links: (piece.raw_material_links?.length ? piece.raw_material_links : ['']) as string[],
        priority: String(piece.priority),
        deadline: toDatetimeLocal(piece.deadline),
    });

    transform((d) => ({
        ...d,
        raw_material_links: (d.raw_material_links as string[]).filter((l) => l.trim() !== ''),
    }));

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(briefRoutes.update.url(piece.id), {
            onSuccess: onClose,
        });
    }

    function field(
        label: string,
        key: keyof typeof data,
        opts?: { placeholder?: string; textarea?: boolean },
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
                        <Pencil className="h-4 w-4" />
                        Editar brief — {piece.client?.name}
                    </DialogTitle>
                </DialogHeader>

                <form id="edit-brief-form" onSubmit={submit} className="space-y-4">
                    {/* Concepto + producto */}
                    <div className="grid grid-cols-2 gap-3">
                        {field('Concepto creativo', 'concept', { placeholder: 'Ej: Lanzamiento Cold Brew...' })}
                        {field('Producto / servicio', 'product', { placeholder: 'Ej: Cold Brew 24hs' })}
                    </div>

                    {/* Categoría + deadline */}
                    <div className="grid grid-cols-2 gap-3">
                        {field('Categoría', 'category', { placeholder: 'Ej: Lanzamiento, Retención...' })}
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Deadline
                            </Label>
                            <Input
                                type="datetime-local"
                                value={data.deadline}
                                onChange={(e) => setData('deadline', e.target.value)}
                            />
                            {errors.deadline && (
                                <p className="text-xs text-destructive">{errors.deadline}</p>
                            )}
                        </div>
                    </div>

                    {/* Prioridad */}
                    <div className="space-y-1.5">
                        <Label>Prioridad</Label>
                        <Select value={data.priority} onValueChange={(v) => setData('priority', v)}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">🔴 Crítico</SelectItem>
                                <SelectItem value="2">🟠 Alto</SelectItem>
                                <SelectItem value="3">🟡 Medio</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {field('Objetivo de campaña', 'objective', { textarea: true, placeholder: 'Qué queremos lograr...' })}
                    {field('Hook visual del video', 'hook', { textarea: true, placeholder: 'Cómo arranca el video...' })}
                    {field('Desarrollo del contenido', 'development', { textarea: true, placeholder: 'Cómo se desarrolla la historia...' })}
                    {field('CTA', 'cta', { placeholder: 'Ej: Pedí el tuyo en...' })}

                    {/* Material de referencia - múltiples links */}
                    <div className="space-y-1.5">
                        <Label>Material de referencia</Label>
                        <MultiLinkInput
                            links={data.raw_material_links as string[]}
                            onChange={(links) => setData('raw_material_links', links)}
                            errors={errors as Record<string, string>}
                        />
                    </div>

                    {field('Notas para el editor', 'brief_notes', { textarea: true, placeholder: 'Instrucciones adicionales...' })}
                </form>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="edit-brief-form" disabled={processing}>
                        <Pencil className="mr-1.5 h-4 w-4" />
                        {processing ? 'Guardando...' : 'Guardar cambios'}
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
    const [editOpen, setEditOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const deadline = fmtDeadline(piece.deadline);

    const allLinks = [
        ...(piece.raw_material_links ?? []),
        ...(piece.raw_material_link && !piece.raw_material_links?.length ? [piece.raw_material_link] : []),
    ].filter(Boolean);

    return (
        <>
            <Card className="border-border bg-card">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    {piece.client?.name}
                                </span>
                                <StatusBadge status={piece.status} />
                                <PriorityBadge priority={piece.priority} />
                                {deadline && (
                                    <span
                                        className={`flex items-center gap-1 text-xs ${deadline.urgent ? 'text-red-400' : 'text-muted-foreground'}`}
                                    >
                                        <Clock className="h-3 w-3" />
                                        {deadline.label}
                                    </span>
                                )}
                            </div>
                            <p className="truncate font-medium text-foreground">
                                {piece.concept ?? piece.product ?? 'Sin concepto'}
                            </p>
                            {piece.editor && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
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
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => setEditOpen(true)}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-muted-foreground transition-colors hover:text-foreground"
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
                        <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm text-foreground">
                            {piece.objective && (
                                <div>
                                    <span className="text-xs tracking-wide text-muted-foreground uppercase">Objetivo</span>
                                    <p>{piece.objective}</p>
                                </div>
                            )}
                            {piece.hook && (
                                <div>
                                    <span className="text-xs tracking-wide text-muted-foreground uppercase">Hook</span>
                                    <p>{piece.hook}</p>
                                </div>
                            )}
                            {piece.cta && (
                                <div>
                                    <span className="text-xs tracking-wide text-muted-foreground uppercase">CTA</span>
                                    <p>{piece.cta}</p>
                                </div>
                            )}
                            {allLinks.length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-xs tracking-wide text-muted-foreground uppercase">Material</span>
                                    {allLinks.map((link, i) => (
                                        <a
                                            key={i}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Link {allLinks.length > 1 ? i + 1 : ''}
                                        </a>
                                    ))}
                                </div>
                            )}
                            {piece.brief_notes && (
                                <div className="rounded bg-muted p-2 text-xs text-muted-foreground">
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
            {editOpen && (
                <EditBriefModal
                    piece={piece}
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                />
            )}
        </>
    );
}

// ─── Review queue card ───────────────────────────────────────────────────────

function ReviewCard({ piece }: { piece: ContentPiece }) {
    const deadline = fmtDeadline(piece.deadline);

    return (
        <Card className="border-border bg-card transition-colors hover:border-ring">
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {piece.client?.name}
                            </span>
                            <PriorityBadge priority={piece.priority} />
                            {deadline && (
                                <span
                                    className={`flex items-center gap-1 text-xs ${deadline.urgent ? 'text-red-400' : 'text-muted-foreground'}`}
                                >
                                    <Clock className="h-3 w-3" />
                                    {deadline.label}
                                </span>
                            )}
                        </div>
                        <p className="truncate font-medium text-foreground">
                            {piece.concept ?? piece.product ?? 'Sin concepto'}
                        </p>
                        {piece.editor && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
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
                        <h1 className="text-2xl font-bold text-foreground">
                            Dashboard PM
                        </h1>
                        <p className="mt-0.5 text-muted-foreground">
                            {reviewQueue.length} para revisar ·{' '}
                            {inProgress.length} en proceso
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/pm/tabla">
                            <Button variant="outline">
                                <Table2 className="mr-2 h-4 w-4" />
                                Vista tabla
                            </Button>
                        </Link>
                        <Button onClick={() => setBriefOpen(true)}>
                            <FilePlus className="mr-2 h-4 w-4" />
                            Nuevo brief
                        </Button>
                    </div>
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
                            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                En proceso
                            </h2>
                            <Badge className="bg-secondary text-secondary-foreground">
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
                        <p className="text-lg font-medium text-foreground">
                            Todo tranquilo por acá
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
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
