import { Head, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import * as adminRoutes from '@/routes/admin';

type AuditEntry = {
    id: number;
    user_id: number | null;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    payload: Record<string, unknown> | null;
    ip: string | null;
    created_at: string;
    user?: { name: string } | null;
};

type PaginatedLogs = {
    data: AuditEntry[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
};

type Props = {
    logs: PaginatedLogs;
    filters: { action?: string; user_id?: string };
};

const ACTION_COLOR: Record<string, string> = {
    'content.approved':         'text-green-400',
    'content.changes_requested':'text-orange-400',
};

function fmt(date: string) {
    return new Date(date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AuditIndex({ logs, filters }: Props) {
    const [action, setAction] = useState(filters.action ?? '');

    function search(e: React.FormEvent) {
        e.preventDefault();
        router.get(adminRoutes.audit(), { action }, { preserveState: true });
    }

    return (
        <>
            <Head title="Auditoría" />
            <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-zinc-100">Auditoría</h1>
                    <form onSubmit={search} className="flex gap-2">
                        <Input
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            placeholder="Filtrar por acción..."
                            className="w-48 h-8 text-sm"
                        />
                        <Button type="submit" size="sm" variant="outline">
                            <Search className="h-3.5 w-3.5" />
                        </Button>
                    </form>
                </div>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                                    <th className="text-left px-4 py-3">Fecha</th>
                                    <th className="text-left px-4 py-3">Usuario</th>
                                    <th className="text-left px-4 py-3">Acción</th>
                                    <th className="text-left px-4 py-3">Entidad</th>
                                    <th className="text-left px-4 py-3">Detalle</th>
                                    <th className="text-left px-4 py-3">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {logs.data.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-zinc-800/30 align-top">
                                        <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">{fmt(entry.created_at)}</td>
                                        <td className="px-4 py-3 text-zinc-300 text-xs">{entry.user?.name ?? `#${entry.user_id}`}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-mono ${ACTION_COLOR[entry.action] ?? 'text-zinc-400'}`}>
                                                {entry.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-500 text-xs">
                                            {entry.entity_type && `${entry.entity_type} #${entry.entity_id}`}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-400 text-xs max-w-xs">
                                            {entry.payload && (
                                                <span>{(entry.payload.client as string) ?? ''}{entry.payload.reviewer ? ` · ${entry.payload.reviewer}` : ''}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-600 text-xs font-mono">{entry.ip}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {logs.data.length === 0 && (
                            <p className="text-center text-zinc-500 py-10">No hay registros.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Paginación */}
                {logs.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        <Button
                            variant="outline" size="sm"
                            disabled={!logs.prev_page_url}
                            onClick={() => logs.prev_page_url && router.get(logs.prev_page_url)}
                        >
                            Anterior
                        </Button>
                        <span className="flex items-center text-sm text-zinc-400">
                            {logs.current_page} / {logs.last_page}
                        </span>
                        <Button
                            variant="outline" size="sm"
                            disabled={!logs.next_page_url}
                            onClick={() => logs.next_page_url && router.get(logs.next_page_url)}
                        >
                            Siguiente
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}
