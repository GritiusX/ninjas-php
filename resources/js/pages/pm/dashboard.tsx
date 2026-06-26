import { Head, Link, router, useForm } from '@inertiajs/react';
import * as XLSX from 'xlsx';
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
    Send,
    Table2,
    Trash2,
    Upload,
    UserCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CopyPublicReviewLink } from '@/components/copy-public-review-link';
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
    approvedQueue: ContentPiece[];
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

const TEMPLATE_HEADER = 'Desarrollo contenido\tInstrucciones editor\tFecha entrega (DD/MM/AAAA)\tMaterial referencia\tCliente';

type BulkRow = {
    client_id: number | null;
    clientName: string;
    development: string;
    brief_notes: string;
    deadline: string;
    raw_material_links: string[];
    error: string | null;
};

function parseDeadline(raw: string): string {
    const trimmed = raw.trim();
    const dmY = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmY) {
        const [, d, m, y] = dmY;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return trimmed;
}

function parseMaterialLinks(raw: string): string[] {
    return raw.split(/[,;\n|]/).map((s) => s.trim()).filter(Boolean);
}

function isValidUrl(value: string): boolean {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

function isBulkHeaderRow(cols: string[]): boolean {
    const first = (cols[0] ?? '').toLowerCase();
    return first.startsWith('desarrollo');
}

function parseTsv(text: string, clients: Client[]): BulkRow[] {
    const lines = text.trim().split('\n').filter((l) => l.trim() !== '');
    const rows: BulkRow[] = [];

    for (const line of lines) {
        const cols = line.split('\t').map((c) => c.trim());

        if (isBulkHeaderRow(cols)) continue;

        const development = cols[0] ?? '';
        const brief_notes = cols[1] ?? '';
        const deadline = parseDeadline(cols[2] ?? '');
        const raw_material_links = parseMaterialLinks(cols[3] ?? '');
        const clientName = cols[4] ?? '';

        if (!clientName || !development) continue;

        const matchedClient = clients.find(
            (c) => c.name.toLowerCase() === clientName.toLowerCase(),
        ) ?? null;

        let error: string | null = null;
        if (!matchedClient) error = `Cliente "${clientName}" no encontrado`;
        else if (raw_material_links.length === 0) error = 'Material referencia requerido';
        else {
            const invalidLink = raw_material_links.find((link) => !isValidUrl(link));
            if (invalidLink) error = `URL inválida: "${invalidLink}"`;
        }

        rows.push({
            client_id: matchedClient?.id ?? null,
            clientName,
            development,
            brief_notes,
            deadline,
            raw_material_links,
            error,
        });
    }

    return rows;
}

function parseSpreadsheetFile(file: File, clients: Client[]): Promise<BulkRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const isCsv = file.name.toLowerCase().endsWith('.csv');

        reader.onload = (e) => {
            try {
                let workbook;
                if (isCsv) {
                    workbook = XLSX.read(e.target!.result as string, { type: 'string' });
                } else {
                    workbook = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array', cellDates: true });
                }
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const raw = XLSX.utils.sheet_to_csv(sheet, { FS: '\t' });
                resolve(parseTsv(raw, clients));
            } catch {
                reject(new Error('No se pudo leer el archivo. Verificá que sea .xlsx o .csv válido.'));
            }
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo.'));
        if (isCsv) {
            reader.readAsText(file, 'UTF-8');
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

function downloadExampleCsv() {
    const esc = (s: string) => (/[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const rows = [
        ['Desarrollo contenido', 'Instrucciones editor', 'Fecha entrega (DD/MM/AAAA)', 'Material referencia', 'Cliente'],
        [
            'Mostrar proceso del producto y persona disfrutándolo',
            'Usar música trending, evitar texto en pantalla',
            '15/07/2025',
            'https://drive.google.com/file/d/ejemplo',
            'Café Gourmet',
        ],
    ];
    const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ejemplo_carga_masiva.csv';
    a.click();
    URL.revokeObjectURL(url);
}

const TEMPLATE_EXAMPLE =
    'Mostrar proceso del producto y persona disfrutándolo\tUsar música trending, evitar texto en pantalla\t15/07/2025\thttps://drive.google.com/file/d/ejemplo\tCafé Gourmet';

function BulkImportModal({
    clients,
    open,
    onClose,
}: {
    clients: Client[];
    open: boolean;
    onClose: () => void;
}) {
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
    const [rows, setRows] = useState<BulkRow[]>([]);
    const [rawText, setRawText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [pasteError, setPasteError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    function handleClose() {
        setStep('input');
        setInputMode('upload');
        setRows([]);
        setRawText('');
        setSearch('');
        setFileError(null);
        setPasteError(null);
        onClose();
    }

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileError(null);
        try {
            const parsed = await parseSpreadsheetFile(file, clients);
            if (parsed.length === 0) {
                setFileError('El archivo no tiene filas con datos válidos.');
                return;
            }
            setRows(parsed);
            setStep('preview');
        } catch (err: unknown) {
            setFileError(err instanceof Error ? err.message : 'Error inesperado.');
        }
        e.target.value = '';
    }

    function handleParse() {
        setPasteError(null);
        const parsed = parseTsv(rawText, clients);
        if (parsed.length === 0) {
            setPasteError('No se encontraron filas con datos válidos. Verificá el formato.');
            return;
        }
        setRows(parsed);
        setStep('preview');
    }

    function handleImport() {
        const payload = rows.map((r) => ({
            client_id: r.client_id,
            concept: r.development.slice(0, 1000),
            development: r.development || null,
            brief_notes: r.brief_notes || null,
            deadline: r.deadline || null,
            raw_material_links: r.raw_material_links,
        }));

        setSubmitting(true);
        router.post(briefRoutes.bulkStore.url(), { rows: payload }, {
            onSuccess: handleClose,
            onFinish: () => setSubmitting(false),
        });
    }

    function copyTemplate() {
        navigator.clipboard.writeText(TEMPLATE_HEADER + '\n' + TEMPLATE_EXAMPLE);
    }

    const hasErrors = rows.some((r) => r.error !== null);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Carga masiva de briefs
                    </DialogTitle>
                </DialogHeader>

                {step === 'input' && (
                    <div className="space-y-4">
                        {/* Tabs */}
                        <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
                            <button
                                type="button"
                                onClick={() => setInputMode('upload')}
                                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    inputMode === 'upload'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Subir archivo
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputMode('paste')}
                                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    inputMode === 'paste'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Pegar tabla
                            </button>
                        </div>

                        {/* Referencia de columnas (siempre visible) */}
                        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1.5">
                            <p className="font-medium text-foreground">Columnas requeridas (en este orden):</p>
                            <p className="font-mono text-xs text-muted-foreground break-all">{TEMPLATE_HEADER}</p>
                            {inputMode === 'upload' ? (
                                <button
                                    type="button"
                                    onClick={downloadExampleCsv}
                                    className="text-xs text-green-400 hover:text-green-300"
                                >
                                    Descargar ejemplo .csv →
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={copyTemplate}
                                    className="text-xs text-green-400 hover:text-green-300"
                                >
                                    Copiar plantilla →
                                </button>
                            )}
                        </div>

                        {/* Subir archivo */}
                        {inputMode === 'upload' && (
                            <>
                                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 px-6 py-12 cursor-pointer hover:border-muted-foreground transition-colors">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground text-center">
                                        Hacé clic o arrastrá tu archivo{' '}
                                        <span className="font-medium text-foreground">.xlsx</span>
                                        {' '}o{' '}
                                        <span className="font-medium text-foreground">.csv</span>
                                    </span>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="sr-only"
                                        onChange={handleFile}
                                    />
                                </label>
                                {fileError && (
                                    <p className="text-xs text-destructive">{fileError}</p>
                                )}
                            </>
                        )}

                        {/* Pegar tabla */}
                        {inputMode === 'paste' && (
                            <div className="space-y-2">
                                <textarea
                                    className="min-h-[180px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    placeholder={`Pegá acá las columnas copiadas desde Excel o Google Sheets:\n\n${TEMPLATE_HEADER}\n${TEMPLATE_EXAMPLE}`}
                                />
                                {pasteError && (
                                    <p className="text-xs text-destructive">{pasteError}</p>
                                )}
                                <Button
                                    type="button"
                                    onClick={handleParse}
                                    disabled={!rawText.trim()}
                                    className="w-full"
                                >
                                    Previsualizar →
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {step === 'preview' && (
                    <div className="space-y-3">
                        {hasErrors && (
                            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                Hay filas con errores. Corregí el archivo y volvé a subir.
                            </div>
                        )}

                        {/* Buscador + contador */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar por desarrollo..."
                                    className="h-8 pl-8 text-sm"
                                />
                            </div>
                            <span className="shrink-0 text-sm text-muted-foreground">
                                {rows.filter(r => !search || r.development.toLowerCase().includes(search.toLowerCase())).length} de {rows.length}
                            </span>
                        </div>

                        {/* Cards grid */}
                        <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                            {rows
                                .filter((r) => !search || r.development.toLowerCase().includes(search.toLowerCase()))
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
                                            <span className="text-xs shrink-0 text-muted-foreground">
                                                {row.deadline || '—'}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-foreground leading-snug line-clamp-3">
                                            {row.development}
                                        </p>
                                        {row.brief_notes && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">{row.brief_notes}</p>
                                        )}
                                        <div className="text-xs pt-1 border-t border-border text-muted-foreground">
                                            {row.raw_material_links.length} link(s) de material
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
                    {step === 'input' && (
                        <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                    )}
                    {step === 'preview' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('input')}>
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
    open,
    onClose,
}: {
    clients: Client[];
    open: boolean;
    onClose: () => void;
}) {
    const { data, setData, post, transform, processing, errors, reset } = useForm<{
        client_id: string;
        development: string;
        brief_notes: string;
        deadline: string;
        raw_material_links: string[];
    }>({
        client_id: '',
        development: '',
        brief_notes: '',
        deadline: '',
        raw_material_links: [''],
    });

    transform((d) => ({
        ...d,
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

    const canSubmit =
        !processing &&
        !!data.client_id &&
        !!data.development.trim() &&
        data.raw_material_links.some((l) => l.trim() !== '');

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FilePlus className="h-5 w-5" />
                        Nuevo brief
                    </DialogTitle>
                </DialogHeader>

                <form id="brief-form" onSubmit={submit} className="space-y-4">
                    {/* Cliente */}
                    <div className="space-y-1.5">
                        <Label>
                            Cliente <span className="text-destructive">*</span>
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
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.client_id && (
                            <p className="text-xs text-destructive">{errors.client_id}</p>
                        )}
                    </div>

                    {/* Desarrollo contenido */}
                    <div className="space-y-1.5">
                        <Label>
                            Desarrollo contenido <span className="text-destructive">*</span>
                        </Label>
                        <textarea
                            className="min-h-[80px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                            value={data.development}
                            onChange={(e) => setData('development', e.target.value)}
                            placeholder="Cómo se desarrolla la historia..."
                        />
                        {errors.development && (
                            <p className="text-xs text-destructive">{errors.development}</p>
                        )}
                    </div>

                    {/* Instrucciones editor */}
                    <div className="space-y-1.5">
                        <Label>Instrucciones editor</Label>
                        <textarea
                            className="min-h-[72px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                            value={data.brief_notes}
                            onChange={(e) => setData('brief_notes', e.target.value)}
                            placeholder="Instrucciones adicionales para el editor..."
                        />
                        {errors.brief_notes && (
                            <p className="text-xs text-destructive">{errors.brief_notes}</p>
                        )}
                    </div>

                    {/* Fecha entrega */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Fecha entrega
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

                    {/* Material referencia */}
                    <div className="space-y-1.5">
                        <Label>
                            Material referencia <span className="text-destructive">*</span>
                        </Label>
                        <MultiLinkInput
                            links={data.raw_material_links}
                            onChange={(links) => setData('raw_material_links', links)}
                            errors={errors as Record<string, string>}
                        />
                    </div>
                </form>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="brief-form" disabled={!canSubmit}>
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
                            <CopyPublicReviewLink token={piece.review_token} />
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

// ─── Metricool schedule modal ────────────────────────────────────────────────

type MetricoolNetwork = { network: string; id: string; label: string };

function MetricoolScheduleModal({
    piece,
    open,
    onClose,
}: {
    piece: ContentPiece;
    open: boolean;
    onClose: () => void;
}) {
    const [networks, setNetworks] = useState<MetricoolNetwork[]>([]);
    const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
    const [dateTime, setDateTime] = useState('');
    const [timezone] = useState('America/Argentina/Buenos_Aires');
    const [text, setText] = useState('');
    const [draft, setDraft] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        setFetchError(null);
        setSelectedNetworks([]);
        fetch(`/pm/pieces/${piece.id}/metricool-networks`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.error) { setFetchError(data.error); return; }
                setNetworks(data.networks ?? []);
                if (data.copy_text) setText(data.copy_text);
            })
            .catch(() => setFetchError('Error al cargar redes de Metricool.'))
            .finally(() => setLoading(false));
    }, [open, piece.id]);

    function toggleNetwork(network: string) {
        setSelectedNetworks((prev) =>
            prev.includes(network) ? prev.filter((n) => n !== network) : [...prev, network],
        );
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedNetworks.length || !dateTime || !text.trim()) return;
        setProcessing(true);
        const providers = networks
            .filter((n) => selectedNetworks.includes(n.network))
            .map(({ network, id }) => ({ network, id }));

        router.post(
            `/pm/pieces/${piece.id}/schedule-metricool`,
            { providers, date_time: dateTime, timezone, text, draft },
            { onFinish: () => { setProcessing(false); onClose(); } },
        );
    }

    const canSubmit = !processing && selectedNetworks.length > 0 && !!dateTime && !!text.trim();

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Programar en Metricool
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    {piece.client?.name} — {piece.concept ?? piece.product ?? 'Sin concepto'}
                </p>

                {loading && (
                    <p className="py-4 text-center text-sm text-muted-foreground">Cargando redes...</p>
                )}

                {fetchError && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {fetchError}
                    </div>
                )}

                {!loading && !fetchError && (
                    <form id="metricool-form" onSubmit={submit} className="space-y-4 pt-1">
                        {/* Networks */}
                        <div className="space-y-2">
                            <Label>Redes sociales</Label>
                            {networks.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No hay redes conectadas para este cliente en Metricool.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {networks.map((n) => (
                                        <button
                                            key={n.network}
                                            type="button"
                                            onClick={() => toggleNetwork(n.network)}
                                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                                selectedNetworks.includes(n.network)
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border bg-background text-foreground hover:border-primary/60'
                                            }`}
                                        >
                                            {n.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Date/time */}
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Fecha y hora de publicación
                            </Label>
                            <Input
                                type="datetime-local"
                                value={dateTime}
                                onChange={(e) => setDateTime(e.target.value)}
                            />
                        </div>

                        {/* Copy text */}
                        <div className="space-y-1.5">
                            <Label>Copy</Label>
                            <textarea
                                className="min-h-[100px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Texto del post..."
                            />
                        </div>

                        {/* Draft toggle */}
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={draft}
                                onChange={(e) => setDraft(e.target.checked)}
                                className="h-4 w-4 rounded border-input accent-primary"
                            />
                            Guardar como borrador (no publicar automáticamente)
                        </label>
                    </form>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="metricool-form"
                        disabled={!canSubmit || loading || !!fetchError}
                    >
                        <Send className="mr-1.5 h-4 w-4" />
                        {processing ? 'Enviando...' : draft ? 'Guardar borrador' : 'Programar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Approved (ready to publish) card ───────────────────────────────────────

function ApprovedCard({ piece }: { piece: ContentPiece }) {
    const [scheduleOpen, setScheduleOpen] = useState(false);

    return (
        <>
            <Card className="border-green-800/40 bg-green-950/20">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold tracking-wide text-green-400 uppercase">
                                    {piece.client?.name}
                                </span>
                                <PriorityBadge priority={piece.priority} />
                            </div>
                            <p className="truncate font-medium text-foreground">
                                {piece.concept ?? piece.product ?? 'Sin concepto'}
                            </p>
                            {piece.final_video_link && (
                                <a
                                    href={piece.final_video_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Ver video
                                </a>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <CopyPublicReviewLink token={piece.review_token} />
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-500 text-white"
                                onClick={() => setScheduleOpen(true)}
                            >
                                <Send className="mr-1.5 h-3.5 w-3.5" />
                                Programar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <MetricoolScheduleModal
                piece={piece}
                open={scheduleOpen}
                onClose={() => setScheduleOpen(false)}
            />
        </>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PmDashboard({
    reviewQueue,
    briefQueue,
    approvedQueue,
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

                {/* Listos para publicar */}
                {approvedQueue.length > 0 && (
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold tracking-wider text-green-400 uppercase">
                                Listos para publicar
                            </h2>
                            <Badge className="border-green-500/30 bg-green-500/20 text-green-400">
                                {approvedQueue.length}
                            </Badge>
                        </div>
                        {approvedQueue.map((p) => (
                            <ApprovedCard key={p.id} piece={p} />
                        ))}
                    </section>
                )}

                {reviewQueue.length === 0 && briefQueue.length === 0 && approvedQueue.length === 0 && (
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
                open={briefOpen}
                onClose={() => setBriefOpen(false)}
            />

            <BulkImportModal
                clients={clients}
                open={bulkOpen}
                onClose={() => setBulkOpen(false)}
            />
        </>
    );
}
