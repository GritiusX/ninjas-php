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
    'content.approved': 'text-green-400',
    'content.changes_requested': 'text-orange-400',
};

function fmt(date: string) {
    return new Date(date).toLocaleString('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
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
            <div className="space-y-5 px-4 py-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-zinc-100">
                        Auditoría
                    </h1>
                    <form onSubmit={search} className="flex gap-2">
                        <Input
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            placeholder="Filtrar por acción..."
                            className="h-8 w-48 text-sm"
                        />
                        <Button type="submit" size="sm" variant="outline">
                            <Search className="h-3.5 w-3.5" />
                        </Button>
                    </form>
                </div>

                <Card className="border-zinc-800 bg-zinc-900">
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 text-xs tracking-wider text-zinc-400 uppercase">
                                    <th className="px-4 py-3 text-left">
                                        Fecha
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Usuario
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Acción
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Entidad
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Detalle
                                    </th>
                                    <th className="px-4 py-3 text-left">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {logs.data.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className="align-top hover:bg-zinc-800/30"
                                    >
                                        <td className="px-4 py-3 text-xs whitespace-nowrap text-zinc-400">
                                            {fmt(entry.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-zinc-300">
                                            {entry.user?.name ??
                                                `#${entry.user_id}`}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`font-mono text-xs ${ACTION_COLOR[entry.action] ?? 'text-zinc-400'}`}
                                            >
                                                {entry.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-zinc-500">
                                            {entry.entity_type &&
                                                `${entry.entity_type} #${entry.entity_id}`}
                                        </td>
                                        <td className="max-w-xs px-4 py-3 text-xs text-zinc-400">
                                            {entry.payload && (
                                                <span>
                                                    {(entry.payload
                                                        .client as string) ??
                                                        ''}
                                                    {entry.payload.reviewer
                                                        ? ` · ${entry.payload.reviewer}`
                                                        : ''}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                                            {entry.ip}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {logs.data.length === 0 && (
                            <p className="py-10 text-center text-zinc-500">
                                No hay registros.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Paginación */}
                {logs.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!logs.prev_page_url}
                            onClick={() =>
                                logs.prev_page_url &&
                                router.get(logs.prev_page_url)
                            }
                        >
                            Anterior
                        </Button>
                        <span className="flex items-center text-sm text-zinc-400">
                            {logs.current_page} / {logs.last_page}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!logs.next_page_url}
                            onClick={() =>
                                logs.next_page_url &&
                                router.get(logs.next_page_url)
                            }
                        >
                            Siguiente
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}
