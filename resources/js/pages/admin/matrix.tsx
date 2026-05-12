import { Head, router, useForm } from '@inertiajs/react';
import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as accessRoutes from '@/routes/admin/access';
import type { Client, Editor } from '@/types';

type AccessRecord = {
    id: number;
    user_id: number;
    client_id: number;
    expires_at: string | null;
};

type Props = {
    editors: Editor[];
    clients: Client[];
    accesses: Record<number, AccessRecord[]>;
};

export default function MatrixIndex({ editors, clients, accesses }: Props) {
    function hasAccess(userId: number, clientId: number): AccessRecord | undefined {
        return accesses[userId]?.find((a) => a.client_id === clientId);
    }

    function toggle(userId: number, clientId: number) {
        const existing = hasAccess(userId, clientId);
        if (existing) {
            if (!confirm('¿Revocar este acceso?')) return;
            router.delete(accessRoutes.revoke.url(existing.id), { preserveScroll: true });
        } else {
            router.post(accessRoutes.grant.url(), { user_id: userId, client_id: clientId }, { preserveScroll: true });
        }
    }

    return (
        <>
            <Head title="Matriz de accesos" />
            <div className="px-4 py-6 space-y-5">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Matriz de accesos</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Controlá qué editores pueden ver cada cliente. Hacé clic en una celda para otorgar o revocar acceso.</p>
                </div>

                <Card className="bg-zinc-900 border-zinc-800 overflow-x-auto">
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800">
                                    <th className="text-left px-4 py-3 text-zinc-400 text-xs uppercase tracking-wider min-w-[140px]">
                                        Editor
                                    </th>
                                    {clients.map((c) => (
                                        <th key={c.id} className="px-3 py-3 text-xs text-zinc-400 uppercase tracking-wider text-center min-w-[110px]">
                                            {c.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {editors.map((editor) => (
                                    <tr key={editor.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-zinc-200">{editor.name}</td>
                                        {clients.map((client) => {
                                            const access = hasAccess(editor.id, client.id);
                                            return (
                                                <td key={client.id} className="px-3 py-3 text-center">
                                                    <button
                                                        onClick={() => toggle(editor.id, client.id)}
                                                        className={`inline-flex items-center justify-center h-8 w-8 rounded-md border transition-all ${
                                                            access
                                                                ? 'bg-green-600/20 border-green-600/50 text-green-400 hover:bg-red-600/20 hover:border-red-600/50 hover:text-red-400'
                                                                : 'bg-zinc-800 border-zinc-700 text-zinc-600 hover:bg-green-600/20 hover:border-green-600/50 hover:text-green-400'
                                                        }`}
                                                        title={access ? 'Revocar acceso' : 'Dar acceso'}
                                                    >
                                                        {access ? <Check className="h-4 w-4" /> : <span className="text-xs">—</span>}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {editors.length === 0 && (
                            <p className="text-center text-zinc-500 py-10">No hay editores activos.</p>
                        )}
                    </CardContent>
                </Card>

                <p className="text-xs text-zinc-600">
                    Los accesos sin fecha de vencimiento son permanentes. Para accesos temporales, usá la sección de Accesos.
                </p>
            </div>
        </>
    );
}
