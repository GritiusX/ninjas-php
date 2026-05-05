import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as userRoutes from '@/routes/admin/users';

export default function UserCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        role: 'editor',
        whatsapp_number: '',
        is_active: true,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(userRoutes.store.url());
    }

    return (
        <>
            <Head title="Nuevo usuario" />
            <div className="mx-auto max-w-xl px-4 py-6 space-y-5">
                <div className="flex items-center gap-3">
                    <Link href={userRoutes.index()}>
                        <Button variant="ghost" size="sm" className="text-zinc-400">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Usuarios
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-zinc-100">Nuevo usuario</h1>
                </div>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="pt-5">
                        <form onSubmit={submit} className="space-y-4">
                            <Field label="Nombre" error={errors.name}>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Nombre completo" autoFocus />
                            </Field>
                            <Field label="Email" error={errors.email}>
                                <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="email@ejemplo.com" />
                            </Field>
                            <Field label="Contraseña" error={errors.password}>
                                <Input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} placeholder="Mínimo 8 caracteres" />
                            </Field>
                            <Field label="Rol" error={errors.role}>
                                <Select value={data.role} onValueChange={(v) => setData('role', v as 'editor' | 'pm' | 'admin')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="editor">Editor</SelectItem>
                                        <SelectItem value="pm">PM</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="WhatsApp (opcional)" error={errors.whatsapp_number}>
                                <Input value={data.whatsapp_number} onChange={(e) => setData('whatsapp_number', e.target.value)} placeholder="+54 9 11 1234-5678" />
                            </Field>
                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="rounded border-zinc-600"
                                />
                                <Label htmlFor="is_active" className="cursor-pointer">Usuario activo</Label>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={processing}>
                                    <Save className="mr-1.5 h-4 w-4" />
                                    Crear usuario
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
