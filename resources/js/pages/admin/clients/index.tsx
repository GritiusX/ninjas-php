import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import * as clientRoutes from '@/routes/admin/clients';
import type { Client } from '@/types';

export default function ClientsIndex({ clients }: { clients: Client[] }) {
    function destroy(id: number, name: string) {
        if (
            !confirm(
                `¿Eliminar a ${name}? Se eliminarán todas sus piezas y métricas.`,
            )
        )
            return;
        router.delete(clientRoutes.destroy.url(id));
    }

    return (
        <>
            <Head title="Clientes" />
            <div className="space-y-5 px-4 py-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Clientes
                    </h1>
                    <Link href={clientRoutes.create()}>
                        <Button size="sm">
                            <Plus className="mr-1.5 h-4 w-4" />
                            Nuevo cliente
                        </Button>
                    </Link>
                </div>

                <Card className="border-border bg-card">
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-xs tracking-wider text-muted-foreground uppercase">
                                    <th className="px-4 py-3 text-left">
                                        Cliente
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        WhatsApp
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        ROAS goal
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Meta Ad Account
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {clients.map((c) => (
                                    <tr
                                        key={c.id}
                                        className="transition-colors hover:bg-muted/40"
                                    >
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            {c.name}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {c.whatsapp_number ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-amber-400">
                                                {Number(c.roas_goal).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {c.meta_ad_account_id ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={clientRoutes.edit.url(
                                                        c.id,
                                                    )}
                                                >
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                                                    onClick={() =>
                                                        destroy(c.id, c.name)
                                                    }
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {clients.length === 0 && (
                            <p className="py-10 text-center text-muted-foreground">
                                No hay clientes.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
