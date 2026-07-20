import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, KeyRound, Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
    email: string | null;
    hasPassword: boolean;
};

export default function MetricoolCredentialsPage({ email, hasPassword }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        email: email ?? '',
        password: '',
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        post('/admin/metricool-credentials', { preserveScroll: true });
    }

    return (
        <>
            <Head title="Credenciales Metricool" />

            <div className="mx-auto max-w-xl space-y-8 px-4 py-8">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        <KeyRound className="h-6 w-6 text-blue-400" />
                        Credenciales de Metricool
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Usuario y contraseña de login usados por el scraper de <code>/metrics2</code> (no confundir con
                        el token de la API oficial, que se configura por variable de entorno). Actualizalas acá si
                        cambia la contraseña de la cuenta de Metricool.
                    </p>
                </div>

                <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Login</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="cuenta@metricool.com"
                                />
                                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password">Contraseña</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder={hasPassword ? '••••••••  (dejar vacío para no cambiarla)' : 'Contraseña de Metricool'}
                                        className="pr-10 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {hasPassword && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Ya hay una contraseña guardada. Dejá el campo vacío para mantenerla.
                                    </p>
                                )}
                                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                            </div>

                            <div className="flex items-center gap-3">
                                <Button type="submit" disabled={processing} size="sm">
                                    <Save className="mr-2 h-3.5 w-3.5" />
                                    {processing ? 'Guardando...' : 'Guardar'}
                                </Button>
                                {recentlySuccessful && <span className="text-xs text-green-400">Guardado.</span>}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
