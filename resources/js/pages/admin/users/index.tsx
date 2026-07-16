import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import * as userRoutes from '@/routes/admin/users';

type User = {
    id: number;
    name: string;
    email: string;
    role: 'editor' | 'pm' | 'admin';
    is_active: boolean;
    whatsapp_number: string | null;
    created_at: string;
};

const ROLE_BADGE: Record<string, string> = {
    admin:      'bg-green-100 text-green-700 border-green-200 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700/40',
    superadmin: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700/40',
    pm:         'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-800/30 dark:text-blue-200 dark:border-blue-700/40',
    editor:     'bg-secondary text-secondary-foreground border-border',
    paid_pauta: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-800/20 dark:text-orange-300 dark:border-orange-700/30',
    diseño:     'bg-secondary text-secondary-foreground border-border',
    redes:      'bg-secondary text-secondary-foreground border-border',
};

const ROLE_LABEL: Record<string, string> = {
    admin:      'Admin',
    superadmin: 'Super Admin',
    pm:         'PM',
    editor:     'Editor',
    paid_pauta: 'Pauta',
    diseño:     'Diseño',
    redes:      'Redes',
};

export default function UsersIndex({ users }: { users: User[] }) {
    const [pending, setPending] = useState<{ id: number; name: string } | null>(null);

    function confirmDestroy(id: number, name: string) {
        setPending({ id, name });
    }

    function handleConfirm() {
        if (!pending) return;
        router.delete(userRoutes.destroy.url(pending.id));
        setPending(null);
    }

    return (
        <>
            <Head title="Usuarios" />
            <div className="space-y-5 px-4 py-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
                    <Link href={userRoutes.create()}>
                        <Button size="sm">
                            <Plus className="mr-1.5 h-4 w-4" />
                            Nuevo usuario
                        </Button>
                    </Link>
                </div>

                <Card className="border-border bg-card">
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-xs tracking-wider text-muted-foreground uppercase">
                                    <th className="px-4 py-3 text-left">Nombre</th>
                                    <th className="px-4 py-3 text-left">Email</th>
                                    <th className="px-4 py-3 text-left">Rol</th>
                                    <th className="px-4 py-3 text-left">Estado</th>
                                    <th className="px-4 py-3 text-left">WhatsApp</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {users.map((u) => (
                                    <tr key={u.id} className="transition-colors hover:bg-muted/40">
                                        <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-secondary text-secondary-foreground border-border'}`}>
                                                {ROLE_LABEL[u.role] ?? u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.is_active ? (
                                                <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-500">
                                                    <UserCheck className="h-3.5 w-3.5" /> Activo
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <UserX className="h-3.5 w-3.5" /> Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">{u.whatsapp_number ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={userRoutes.edit.url(u.id)}>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                                                    onClick={() => confirmDestroy(u.id, u.name)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {users.length === 0 && (
                            <p className="py-10 text-center text-muted-foreground">No hay usuarios.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ConfirmDialog
                open={!!pending}
                title={`¿Eliminar a ${pending?.name}?`}
                description="Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                onConfirm={handleConfirm}
                onCancel={() => setPending(null)}
            />
        </>
    );
}
