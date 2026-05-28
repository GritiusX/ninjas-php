import { Head, router } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
    const [pending, setPending] = useState<AccessRecord | null>(null);

    function hasAccess(userId: number, clientId: number): AccessRecord | undefined {
        return accesses[userId]?.find((a) => a.client_id === clientId);
    }

    function toggle(userId: number, clientId: number) {
        const existing = hasAccess(userId, clientId);
        if (existing) {
            setPending(existing);
        } else {
            router.post(accessRoutes.grant.url(), { user_id: userId, client_id: clientId }, { preserveScroll: true });
        }
    }

    function handleConfirmRevoke() {
        if (!pending) return;
        router.delete(accessRoutes.revoke.url(pending.id), { preserveScroll: true });
        setPending(null);
    }

    return (
        <>
            <Head title="Matriz de accesos" />
            <div className="px-4 py-6 space-y-5">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Matriz de accesos</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">Controlá qué editores pueden ver cada cliente. Hacé clic en una celda para otorgar o revocar acceso.</p>
                </div>

                <Card className="bg-card border-border overflow-x-auto">
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider min-w-[140px]">
                                        Editor
                                    </th>
                                    {clients.map((c) => (
                                        <th key={c.id} className="px-3 py-3 text-xs text-muted-foreground uppercase tracking-wider text-center min-w-[110px]">
                                            {c.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {editors.map((editor) => (
                                    <tr key={editor.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-foreground">{editor.name}</td>
                                        {clients.map((client) => {
                                            const access = hasAccess(editor.id, client.id);
                                            return (
                                                <td key={client.id} className="px-3 py-3 text-center">
                                                    <button
                                                        onClick={() => toggle(editor.id, client.id)}
                                                        className={`inline-flex items-center justify-center h-8 w-8 rounded-md border transition-all ${
                                                            access
                                                                ? 'bg-green-600/20 border-green-600/50 text-green-400 hover:bg-red-600/20 hover:border-red-600/50 hover:text-red-400'
                                                                : 'bg-muted border-border text-muted-foreground hover:bg-green-600/20 hover:border-green-600/50 hover:text-green-400'
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
                            <p className="text-center text-muted-foreground py-10">No hay editores activos.</p>
                        )}
                    </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground">
                    Los accesos sin fecha de vencimiento son permanentes. Para accesos temporales, usá la sección de Accesos.
                </p>
            </div>

            <ConfirmDialog
                open={!!pending}
                title="¿Revocar este acceso?"
                description="El editor perderá acceso a este cliente inmediatamente."
                confirmLabel="Revocar"
                onConfirm={handleConfirmRevoke}
                onCancel={() => setPending(null)}
            />
        </>
    );
}
