import { Head, Link, router, useForm } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, Bell, Check, ChevronDown, ChevronRight, Download, Eye, ExternalLink, MessageSquare, Pencil, Send, UserCheck, X } from 'lucide-react';
import { useState } from 'react';
import { DeleteBriefButton } from '@/components/delete-brief-button';
import { MetricoolScheduleModal } from '@/components/metricool-schedule-modal';
import { OpenAsEditorLink } from '@/components/open-as-editor-link';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as briefRoutes from '@/routes/pm/brief';
import * as reviewRoutes from '@/routes/pm/review';
import type { Client, ContentPiece, Editor } from '@/types';

type Props = {
    pieces: ContentPiece[];
    clients: Client[];
    editors: Editor[];
};

function editorLabel(e: Editor) {
    if (e.role === 'editor') return e.name;
    const roleName = e.role === 'superadmin' ? 'Superadmin' : e.role === 'pm' ? 'PM' : 'Admin';
    return `${e.name} (${roleName})`;
}

// ─── Inline row editor ───────────────────────────────────────────────────────

export function EditableRow({
    piece,
    editors,
}: {
    piece: ContentPiece;
    editors: Editor[];
}) {
    const [editing, setEditing] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const allLinks = [
        ...(piece.raw_material_links ?? []),
        ...(piece.raw_material_link && !piece.raw_material_links?.length ? [piece.raw_material_link] : []),
    ].filter(Boolean);

    const toDatetimeLocal = (iso: string | null) => {
        if (!iso) return '';
        return iso.replace(' ', 'T').slice(0, 16);
    };

    const { data, setData, put, processing, reset, clearErrors, errors } = useForm({
        title: piece.title ?? '',
        concept: piece.concept ?? '',
        product: piece.product ?? '',
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
        clearErrors();
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
        const errorList = Object.values(errors).filter(Boolean);

        return (
            <>
                <tr className="border-b border-border bg-muted/30">
                    <td className="px-3 py-2 text-sm text-muted-foreground">{piece.client?.name}</td>
                    <td className="px-3 py-2">
                        <Input
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Título..."
                        />
                    </td>
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
                {errorList.length > 0 && (
                    <tr className="border-b border-border bg-muted/30">
                        <td colSpan={7} className="px-3 pb-2 text-xs text-red-400">
                            No se pudo guardar: {errorList.join(' · ')}
                        </td>
                    </tr>
                )}
            </>
        );
    }

    const pendingEditorNotify = piece.status === 'CLIENT_REVISION' && !!piece.editor;
    const roundNumber = (piece.review_rounds?.length ?? 0) + 1;
    const isReReview = piece.status === 'INTERNAL_REVIEW' && roundNumber > 1;

    return (
        <>
            <tr
                className={`border-b border-border hover:bg-muted/20 transition-colors ${
                    pendingEditorNotify ? 'border-l-2 border-l-rose-500 bg-rose-500/5' : ''
                } ${isReReview ? 'border-l-2 border-l-amber-400 bg-amber-500/5' : ''}`}
                title={pendingEditorNotify ? 'Esperando que se avise al editor sobre los cambios pedidos por el cliente' : undefined}
            >
                <td className="px-3 py-2.5 text-sm font-medium text-muted-foreground">
                    {piece.client?.name}
                </td>
                <td className="px-3 py-2.5 text-sm text-foreground max-w-xs truncate">
                    {piece.title ?? <span className="text-muted-foreground italic">Sin título</span>}
                </td>
                <td className="px-3 py-2.5 text-sm text-foreground max-w-xs truncate">
                    {piece.development ?? piece.concept ?? piece.product ?? <span className="text-muted-foreground italic">Sin desarrollo</span>}
                </td>
                <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                        <StatusBadge status={piece.status} />
                        {isReReview && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap">
                                Ronda {roundNumber}
                            </span>
                        )}
                        {piece.client_feedback && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-amber-500 cursor-default" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
                                    {piece.client_feedback}
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </td>
                <td className="px-3 py-2.5 text-sm">
                    <button
                        onClick={() => setAssignOpen(true)}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                        {piece.editor ? (
                            <span className="text-foreground">{piece.editor.name}</span>
                        ) : (
                            <>
                                <UserCheck className="h-3 w-3" />
                                Asignar
                            </>
                        )}
                    </button>
                </td>
                <td className="px-3 py-2.5 text-sm">
                    {deadlineDisplay()}
                </td>
                <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                        <Link href={reviewRoutes.show.url(piece.id)}>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Ver / revisar"
                            >
                                <Eye className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                        <OpenAsEditorLink piece={piece} />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title={piece.assigned_editor_id ? 'Reasignar editor' : 'Asignar editor'}
                            onClick={() => setAssignOpen(true)}
                        >
                            <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                        {piece.status === 'CLIENT_APPROVED' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-green-600 hover:text-green-500 hover:bg-green-500/10"
                                        onClick={() => setScheduleOpen(true)}
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Programar en Metricool</TooltipContent>
                            </Tooltip>
                        )}
                        {pendingEditorNotify && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                                title="Avisar al editor"
                                onClick={() => router.post(`/pm/review/${piece.id}/notify-editor`)}
                            >
                                <Bell className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Ver tarea"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>
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
                        <DeleteBriefButton pieceId={piece.id} label={piece.title ?? piece.concept ?? piece.product} />
                    </div>
                </td>
            </tr>

            {expanded && (
                <tr className="border-b border-border bg-muted/20">
                    <td colSpan={7} className="px-3 py-3">
                        <div className="space-y-2 text-sm text-foreground">
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
                                <div className="flex items-start gap-1 rounded bg-muted p-2 text-xs text-muted-foreground">
                                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                    {piece.brief_notes}
                                </div>
                            )}
                            {!piece.objective && !piece.hook && !piece.cta && allLinks.length === 0 && !piece.brief_notes && (
                                <p className="text-xs text-muted-foreground italic">Sin detalles adicionales.</p>
                            )}
                        </div>
                    </td>
                </tr>
            )}

            {assignOpen && (
                <AssignEditorModal
                    piece={piece}
                    editors={editors}
                    open={assignOpen}
                    onClose={() => setAssignOpen(false)}
                />
            )}
            {scheduleOpen && (
                <MetricoolScheduleModal
                    piece={piece}
                    open={scheduleOpen}
                    onClose={() => setScheduleOpen(false)}
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
                    {piece.client?.name} — {piece.title ?? piece.concept ?? piece.product ?? 'Sin concepto'}
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
                                    <SelectItem key={e.id} value={String(e.id)}>{editorLabel(e)}</SelectItem>
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
        return new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime();
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
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desarrollo</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
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
