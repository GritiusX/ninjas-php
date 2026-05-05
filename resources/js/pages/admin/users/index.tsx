import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2, UserCheck, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    admin:  'bg-purple-600/20 text-purple-300 border-purple-600/30',
    pm:     'bg-blue-600/20 text-blue-300 border-blue-600/30',
    editor: 'bg-zinc-600/20 text-zinc-300 border-zinc-600/30',
};

export default function UsersIndex({ users }: { users: User[] }) {
    function destroy(id: number, name: string) {
        if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
        router.delete(userRoutes.destroy.url(id));
    }

    return (
        <>
            <Head title="Usuarios" />
            <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-zinc-100">Usuarios</h1>
                    <Link href={userRoutes.create()}>
                        <Button size="sm">
                            <Plus className="mr-1.5 h-4 w-4" />
                            Nuevo usuario
                        </Button>
                    </Link>
                </div>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                                    <th className="text-left px-4 py-3">Nombre</th>
                                    <th className="text-left px-4 py-3">Email</th>
                                    <th className="text-left px-4 py-3">Rol</th>
                                    <th className="text-left px-4 py-3">Estado</th>
                                    <th className="text-left px-4 py-3">WhatsApp</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors">
                                        <td className="px-4 py-3 font-medium text-zinc-200">{u.name}</td>
                                        <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_BADGE[u.role]}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.is_active ? (
                                                <span className="flex items-center gap-1 text-green-400 text-xs">
                                                    <UserCheck className="h-3.5 w-3.5" /> Activo
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-zinc-500 text-xs">
                                                    <UserX className="h-3.5 w-3.5" /> Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-400 text-xs">{u.whatsapp_number ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={userRoutes.edit.url(u.id)}>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400"
                                                    onClick={() => destroy(u.id, u.name)}
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
                            <p className="text-center text-zinc-500 py-10">No hay usuarios.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
