import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, Download, Pencil, UserCheck, X } from 'lucide-react';
import { useState } from 'react';
import { PriorityBadge } from '@/components/priority-badge';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
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
import type { Client, ContentPiece, Editor } from '@/types';

type Props = {
    pieces: ContentPiece[];
    clients: Client[];
    editors: Editor[];
};

// ─── Inline row editor ───────────────────────────────────────────────────────

function EditableRow({
    piece,
    editors,
}: {
    piece: ContentPiece;
    editors: Editor[];
}) {
    const [editing, setEditing] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);

    const toDatetimeLocal = (iso: string | null) => {
        if (!iso) return '';
        return iso.replace(' ', 'T').slice(0, 16);
    };

    const { data, setData, put, processing, reset } = useForm({
        concept: piece.concept ?? '',
        product: piece.product ?? '',
        priority: String(piece.priority),
        deadline: toDatetimeLocal(piece.deadline),
        brief_notes: piece.brief_notes ?? '',
    });

    function save() {
        put(briefRoutes.update.url(piece.id), {
            onSuccess: () => setEditing(false),
        });
    }

    function cancel() {
        reset();
        setEditing(false);
    }

    const deadlineDisplay = () => {
        if (!piece.deadline) return <span className="text-muted-foreground">—</span>;
        const date = new Date(piece.deadline);
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
        const urgent = diff <= 1;
        return (
            <span className={urgent ? 'text-red-400 font-medium' : 'text-foreground'}>
                {d}/{m}
            </span>
        );
    };

    if (editing) {
        return (
            <tr className="border-b border-border bg-muted/30">
                <td className="px-3 py-2 text-sm text-muted-foreground">{piece.client?.name}</td>
                <td className="px-3 py-2">
                    <Input
                        value={data.concept}
                        onChange={(e) => setData('concept', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Concepto..."
                    />
                </td>
                <td className="px-3 py-2">
                    <StatusBadge status={piece.status} />
                </td>
                <td className="px-3 py-2">
                    <Select value={data.priority} onValueChange={(v) => setData('priority', v)}>
                        <SelectTrigger className="h-8 w-28 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">🔴 Crítico</SelectItem>
                            <SelectItem value="2">🟠 Alto</SelectItem>
                            <SelectItem value="3">🟡 Medio</SelectItem>
                        </SelectContent>
                    </Select>
                </td>
                <td className="px-3 py-2 text-sm text-muted-foreground">
                    {piece.editor?.name ?? '—'}
                </td>
                <td className="px-3 py-2">
                    <Input
                        type="datetime-local"
                        value={data.deadline}
                        onChange={(e) => setData('deadline', e.target.value)}
                        className="h-8 text-sm"
                    />
                </td>
                <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                        <Button size="icon" variant="default" className="h-7 w-7" onClick={save} disabled={processing}>
                            <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancel} disabled={processing}>
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <>
            <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2.5 text-sm font-medium text-muted-foreground">
                    {piece.client?.name}
                </td>
                <td className="px-3 py-2.5 text-sm text-foreground max-w-xs truncate">
                    {piece.concept ?? piece.product ?? <span className="text-muted-foreground italic">Sin concepto</span>}
                </td>
                <td className="px-3 py-2.5">
                    <StatusBadge status={piece.status} />
                </td>
                <td className="px-3 py-2.5">
                    <PriorityBadge priority={piece.priority} />
                </td>
                <td className="px-3 py-2.5 text-sm">
                    {piece.editor ? (
                        <span className="text-foreground">{piece.editor.name}</span>
                    ) : (
                        <button
                            onClick={() => setAssignOpen(true)}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                            <UserCheck className="h-3 w-3" />
                            Asignar
                        </button>
                    )}
                </td>
                <td className="px-3 py-2.5 text-sm">
                    {deadlineDisplay()}
                </td>
                <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                        <a href={briefRoutes.pdf.url(piece.id)} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Descargar brief PDF">
                                <Download className="h-3.5 w-3.5" />
                            </Button>
                        </a>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </td>
            </tr>

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
        post(briefRoutes.assign.url(piece.id), { onSuccess: onClose });
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Asignar editor</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    {piece.client?.name} — {piece.concept ?? piece.product ?? 'Sin concepto'}
                </p>
                <form id="assign-form-tabla" onSubmit={submit} className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                        <Label>Editor</Label>
                        <Select value={data.editor_id} onValueChange={(v) => setData('editor_id', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Elegí un editor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {editors.map((e) => (
                                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </form>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={processing}>Cancelar</Button>
                    <Button type="submit" form="assign-form-tabla" disabled={processing || !data.editor_id}>
                        <UserCheck className="mr-1.5 h-4 w-4" />
                        Asignar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = {
    BRIEF: 0,
    EDITING: 1,
    REVISION: 2,
    INTERNAL_REVIEW: 3,
    PM_APPROVED: 4,
    CLIENT_REVIEW: 5,
    CLIENT_REVISION: 6,
};

export default function PmTabla({ pieces, clients, editors }: Props) {
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filtered = pieces.filter((p) => {
        if (clientFilter !== 'all' && String(p.client_id) !== clientFilter) return false;
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return a.priority - b.priority;
    });

    return (
        <>
            <Head title="Tabla PM" />

            <div className="px-4 py-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/pm"
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Dashboard
                        </Link>
                        <h1 className="text-xl font-bold text-foreground">Vista tabla</h1>
                        <span className="text-sm text-muted-foreground">({sorted.length} piezas)</span>
                    </div>

                    {/* Filtros */}
                    <div className="flex items-center gap-2">
                        <Select value={clientFilter} onValueChange={setClientFilter}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Todos los clientes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los clientes</SelectItem>
                                {clients.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Todos los estados" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                <SelectItem value="BRIEF">Brief</SelectItem>
                                <SelectItem value="EDITING">Editando</SelectItem>
                                <SelectItem value="REVISION">Revisión</SelectItem>
                                <SelectItem value="INTERNAL_REVIEW">Revisión interna</SelectItem>
                                <SelectItem value="PM_APPROVED">Aprobado PM</SelectItem>
                                <SelectItem value="CLIENT_REVIEW">Con el cliente</SelectItem>
                                <SelectItem value="CLIENT_REVISION">Revisión cliente</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tabla */}
                <div className="rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concepto</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prioridad</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Editor</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deadline</th>
                                    <th className="px-3 py-2.5 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((p) => (
                                    <EditableRow key={p.id} piece={p} editors={editors} />
                                ))}
                                {sorted.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                                            No hay piezas con los filtros seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
