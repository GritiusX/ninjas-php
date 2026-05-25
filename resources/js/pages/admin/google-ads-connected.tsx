import { Head, Link } from '@inertiajs/react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoogleAdsConnected({ refresh_token }: { refresh_token: string }) {
    return (
        <>
            <Head title="Google Ads conectado" />
            <div className="flex min-h-screen items-center justify-center px-4">
                <div className="w-full max-w-md space-y-6 text-center">
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Google Ads conectado</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            El refresh token fue guardado automáticamente en el servidor.
                        </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted p-4 text-left">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Refresh Token</p>
                        <p className="break-all font-mono text-xs text-foreground">{refresh_token}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Ya podés cerrar esta página. Las métricas de Google Ads se sincronizarán en el próximo ciclo.
                    </p>
                    <Link href="/admin/users">
                        <Button className="w-full">Volver al panel</Button>
                    </Link>
                </div>
            </div>
        </>
    );
}
