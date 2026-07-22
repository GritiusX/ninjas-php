import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const MESSAGES = [
    'Scrapeando Metricool...',
    'Actualizando información...',
    'Acomodando datos scrapeados...',
    'Casi listo...',
    'Procesando resultados finales...',
];

type Props = {
    visible: boolean;
    error?: string | null;
    onRetry?: () => void;
    onCancel?: () => void;
};

export function ScrapingOverlay({ visible, error, onRetry, onCancel }: Props) {
    const [msgIndex, setMsgIndex] = useState(0);

    useEffect(() => {
        if (!visible || error) {
            setMsgIndex(0);
            return;
        }
        const interval = setInterval(() => {
            setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
        }, 15000);
        return () => clearInterval(interval);
    }, [visible, error]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-5 rounded-2xl bg-white px-12 py-10 shadow-2xl dark:bg-zinc-900">
                {error ? (
                    <>
                        <AlertCircle className="h-9 w-9 text-red-500" />
                        <div className="text-center">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Ocurrió un error</p>
                            <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">{error}</p>
                        </div>
                        {onRetry && (
                            <Button size="sm" onClick={onRetry}>Reintentar</Button>
                        )}
                    </>
                ) : (
                    <>
                        <Loader2 className="h-9 w-9 animate-spin text-blue-500" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{MESSAGES[msgIndex]}</p>
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                className="mt-1 text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                Volver atrás
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
