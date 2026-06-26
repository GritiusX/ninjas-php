import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Ban, Home, RefreshCw, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ERROR_META: Record<number, { icon: typeof AlertTriangle; title: string; description: string }> = {
    403: {
        icon: Ban,
        title: 'Sin permiso',
        description: 'No tenés acceso a esta página.',
    },
    405: {
        icon: Ban,
        title: 'Este enlace ya fue utilizado',
        description: 'Ya respondiste sobre este contenido. Si necesitás hacer un cambio, comunicate con tu agencia.',
    },
    404: {
        icon: AlertTriangle,
        title: 'Página no encontrada',
        description: 'El recurso que buscás no existe o fue eliminado.',
    },
    500: {
        icon: ServerCrash,
        title: 'Error del servidor',
        description: 'Algo salió mal de nuestro lado. Ya estamos al tanto.',
    },
    503: {
        icon: ServerCrash,
        title: 'Servicio no disponible',
        description: 'La aplicación está en mantenimiento. Volvé en unos minutos.',
    },
};

export default function ErrorPage({ status }: { status: number }) {
    const meta = ERROR_META[status] ?? {
        icon: AlertTriangle,
        title: `Error ${status}`,
        description: 'Ocurrió un error inesperado.',
    };

    const Icon = meta.icon;

    return (
        <>
            <Head title={meta.title} />
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
                <div className="flex flex-col items-center gap-4 max-w-sm">
                    <div className="rounded-full bg-muted p-4">
                        <Icon className="h-10 w-10 text-muted-foreground" />
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-4xl font-bold text-foreground">{status}</p>
                        <h1 className="text-xl font-semibold text-foreground">{meta.title}</h1>
                        <p className="text-sm text-muted-foreground">{meta.description}</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        {status !== 405 && (
                            <Button variant="outline" onClick={() => router.visit('/')}>
                                <Home className="mr-1.5 h-4 w-4" />
                                Inicio
                            </Button>
                        )}
                        {status >= 500 && (
                            <Button variant="outline" onClick={() => window.location.reload()}>
                                <RefreshCw className="mr-1.5 h-4 w-4" />
                                Reintentar
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
