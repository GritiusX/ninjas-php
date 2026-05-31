import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    Download,
    ExternalLink,
    FilePlus,
    Pencil,
    Plus,
    Search,
    Table2,
    Trash2,
    Upload,
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
import type { Client, ContentPiece, Editor, Priority } from '@/types';

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

// ─── Bulk import modal ───────────────────────────────────────────────────────

const TEMPLATE_HEADER = 'Cliente\tConcepto\tProducto\tCategoría\tHook\tCTA\tPrioridad\tDeadline (DD/MM/AAAA)\tEditor';
const TEMPLATE_EXAMPLE = 'Café Gourmet\tLanzamiento Cold Brew\tCold Brew 24hs\tLanzamiento\tBarista vierte el café en slow motion\tPedí el tuyo en...\tAlto\t15/07/2025\tAna';

type BulkRow = {
    client_id: number | null;
    clientName: string;
    concept: string;
    product: string;
    category: string;
    hook: string;
    cta: string;
    priority: Priority;
    deadline: string;
    editor_id: number | null;
    editorName: string;
    error: string | null;
};

function parsePriority(raw: string): Priority {
    const v = raw.trim().toLowerCase();
    if (v === 'crítico' || v === 'critico' || v === '1') return 1;
    if (v === 'alto' || v === '2') return 2;
    return 3;
}

function parseDeadline(raw: string): string {
    const trimmed = raw.trim();
    const dmY = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmY) {
        const [, d, m, y] = dmY;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return trimmed;
}

function parseTsv(text: string, clients: Client[], editors: Editor[]): BulkRow[] {
    const lines = text.trim().split('\n').filter((l) => l.trim() !== '');
    const rows: BulkRow[] = [];

    for (const line of lines) {
        const cols = line.split('\t').map((c) => c.trim());
        const clientName = cols[0] ?? '';

        // skip header row
        if (clientName.toLowerCase() === 'cliente') continue;

        const concept = cols[1] ?? '';
        if (!clientName || !concept) continue;

        const matchedClient = clients.find(
            (c) => c.name.toLowerCase() === clientName.toLowerCase(),
        ) ?? null;

        const editorName = cols[8] ?? '';
        const matchedEditor = editorName
            ? (editors.find((e) => e.name.toLowerCase() === editorName.toLowerCase()) ?? null)
            : null;

        let error: string | null = null;
        if (!matchedClient) error = `Cliente "${clientName}" no encontrado`;
        else if (editorName && !matchedEditor) error = `Editor "${editorName}" no encontrado`;

        rows.push({
            client_id: matchedClient?.id ?? null,
            clientName,
            concept,
            product: cols[2] ?? '',
            category: cols[3] ?? '',
            hook: cols[4] ?? '',
            cta: cols[5] ?? '',
            priority: parsePriority(cols[6] ?? ''),
            deadline: parseDeadline(cols[7] ?? ''),
            editor_id: matchedEditor?.id ?? null,
            editorName,
            error,
        });
    }

    return rows;
}

const PRIORITY_LABEL: Record<Priority, string> = { 1: '🔴 Crítico', 2: '🟠 Alto', 3: '🟡 Medio' };

function BulkImportModal({
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
    const [step, setStep] = useState<'paste' | 'preview'>('paste');
    const [rawText, setRawText] = useState('');
    const [rows, setRows] = useState<BulkRow[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');

    function handleClose() {
        setStep('paste');
        setRawText('');
        setRows([]);
        setSearch('');
        onClose();
    }

    function handleParse() {
        const parsed = parseTsv(rawText, clients, editors);
        setRows(parsed);
        setStep('preview');
    }

    function handleImport() {
        const payload = rows.map((r) => ({
            client_id: r.client_id,
            concept: r.concept,
            product: r.product || null,
            category: r.category || null,
            hook: r.hook || null,
            cta: r.cta || null,
            priority: r.priority,
            deadline: r.deadline || null,
            editor_id: r.editor_id || null,
        }));

        setSubmitting(true);
        router.post(briefRoutes.bulkStore.url(), { rows: payload }, {
            onSuccess: handleClose,
            onFinish: () => setSubmitting(false),
        });
    }

    const hasErrors = rows.some((r) => r.error !== null);
    const copyTemplate = () => {
        navigator.clipboard.writeText(TEMPLATE_HEADER + '\n' + TEMPLATE_EXAMPLE);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Carga masiva de briefs
                    </DialogTitle>
                </DialogHeader>

                {step === 'paste' && (
                    <div className="space-y-4">
                        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1.5">
                            <p className="font-medium text-foreground">Columnas del template (en este orden):</p>
                            <p className="font-mono text-xs text-muted-foreground break-all">{TEMPLATE_HEADER}</p>
                            <button
                                type="button"
                                onClick={copyTemplate}
                                className="text-xs text-blue-400 hover:text-blue-300"
                            >
                                Copiar template con ejemplo →
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Pegá tu tabla acá (copiada desde Excel o Google Sheets)</Label>
                            <textarea
                                className="min-h-[180px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder={"Cliente\tConcepto\tProducto\t...\nCafé Gourmet\tLanzamiento Cold Brew\t..."}
                            />
                        </div>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="space-y-3">
                        {hasErrors && (
                            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                Hay filas con errores. Corregí el texto y volvé a parsear.
                            </div>
                        )}

                        {/* Buscador + contador */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar por título..."
                                    className="h-8 pl-8 text-sm"
                                />
                            </div>
                            <span className="shrink-0 text-sm text-muted-foreground">
                                {rows.filter(r => !search || r.concept.toLowerCase().includes(search.toLowerCase())).length} de {rows.length}
                            </span>
                        </div>

                        {/* Cards grid */}
                        <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                            {rows
                                .filter((r) => !search || r.concept.toLowerCase().includes(search.toLowerCase()))
                                .map((row, i) => (
                                    <div
                                        key={i}
                                        className={`rounded-lg border p-3 space-y-2 ${
                                            row.error
                                                ? 'border-destructive/50 bg-destructive/10'
                                                : 'border-border bg-card'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                {row.clientName}
                                            </span>
                                            <span className="text-xs shrink-0">{PRIORITY_LABEL[row.priority]}</span>
                                        </div>
                                        <p className="text-sm font-medium text-foreground leading-snug">
                                            {row.concept}
                                        </p>
                                        {row.hook && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">{row.hook}</p>
                                        )}
                                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                                            <span className="text-muted-foreground">
                                                {row.editorName || <span className="italic">Sin editor</span>}
                                            </span>
                                            <span className="text-muted-foreground">{row.deadline || '—'}</span>
                                        </div>
                                        {row.error && (
                                            <p className="text-xs text-destructive font-medium">{row.error}</p>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 'paste' && (
                        <>
                            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                            <Button onClick={handleParse} disabled={!rawText.trim()}>
                                Previsualizar →
                            </Button>
                        </>
                    )}
                    {step === 'preview' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('paste')}>
                                ← Volver
                            </Button>
                            <Button onClick={handleImport} disabled={hasErrors || submitting || rows.length === 0}>
                                <Upload className="mr-1.5 h-4 w-4" />
                                {submitting ? 'Creando...' : `Crear ${rows.length} brief(s)`}
                            </Button>
                        </>
                    )}
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

    const canSubmit =
        !processing &&
        !!data.client_id &&
        !!data.concept.trim() &&
        !!data.deadline &&
        data.editor_id !== 'none' &&
        data.raw_material_links.some((l) => l.trim() !== '');

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
                            <Label>
                                Asignar editor{' '}
                                <span className="text-destructive">*</span>
                            </Label>
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
                        <Label>
                            Material de referencia{' '}
                            <span className="text-destructive">*</span>
                        </Label>
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
                            <a href={`/pm/brief/${piece.id}/pdf`} target="_blank" rel="noopener noreferrer">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    type="button"
                                    title="Descargar brief PDF"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </Button>
                            </a>
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
    const [bulkOpen, setBulkOpen] = useState(false);
    const [briefClientId, setBriefClientId] = useState('');

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
                        <div className="flex items-center gap-1">
                            <Select value={briefClientId} onValueChange={setBriefClientId}>
                                <SelectTrigger className="h-9 w-44 text-xs">
                                    <SelectValue placeholder="Brief por cliente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <a
                                href={briefClientId ? `/pm/client/${briefClientId}/brief-pdf` : '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => { if (!briefClientId) e.preventDefault(); }}
                            >
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9"
                                    disabled={!briefClientId}
                                    title="Descargar brief del cliente"
                                    type="button"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            </a>
                        </div>
                        <Button variant="outline" onClick={() => setBulkOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Carga masiva
                        </Button>
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

            <BulkImportModal
                clients={clients}
                editors={editors}
                open={bulkOpen}
                onClose={() => setBulkOpen(false)}
            />
        </>
    );
}
