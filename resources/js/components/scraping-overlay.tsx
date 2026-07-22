import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const MESSAGES = [
    'Scrapeando Metricool...',
    'Actualizando información...',
    'Acomodando datos scrapeados...',
    'Casi listo...',
    'Procesando resultados finales...',
];

export function ScrapingOverlay({ visible }: { visible: boolean }) {
    const [msgIndex, setMsgIndex] = useState(0);

    useEffect(() => {
        if (!visible) {
            setMsgIndex(0);
            return;
        }
        const interval = setInterval(() => {
            setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
        }, 15000);
        return () => clearInterval(interval);
    }, [visible]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-5 rounded-2xl bg-white px-12 py-10 shadow-2xl">
                <Loader2 className="h-9 w-9 animate-spin text-blue-500" />
                <p className="text-sm font-medium text-gray-700 transition-all">{MESSAGES[msgIndex]}</p>
            </div>
        </div>
    );
}
