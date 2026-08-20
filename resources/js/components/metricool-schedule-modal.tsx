import { router } from '@inertiajs/react';
import { AlertCircle, Calendar, Send, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ContentPiece } from '@/types';

type MetricoolNetwork = { network: string; id: string; label: string };

export function MetricoolScheduleModal({
    piece,
    open,
    onClose,
}: {
    piece: ContentPiece;
    open: boolean;
    onClose: () => void;
}) {
    const [networks, setNetworks] = useState<MetricoolNetwork[]>([]);
    const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
    const [dateTime, setDateTime] = useState('');
    const [timezone] = useState('America/Argentina/Buenos_Aires');
    const [text, setText] = useState('');
    const [draft, setDraft] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        setFetchError(null);
        setSelectedNetworks([]);
        fetch(`/pm/pieces/${piece.id}/metricool-networks`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.error) { setFetchError(data.error); return; }
                setNetworks(data.networks ?? []);
                if (data.copy_text) setText(data.copy_text);
            })
            .catch(() => setFetchError('Error al cargar redes de Metricool.'))
            .finally(() => setLoading(false));
    }, [open, piece.id]);

    function toggleNetwork(network: string) {
        setSelectedNetworks((prev) =>
            prev.includes(network) ? prev.filter((n) => n !== network) : [...prev, network],
        );
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedNetworks.length || !dateTime || !text.trim()) return;
        setProcessing(true);
        const providers = networks
            .filter((n) => selectedNetworks.includes(n.network))
            .map(({ network, id }) => ({ network, id }));

        router.post(
            `/pm/pieces/${piece.id}/schedule-metricool`,
            { providers, date_time: dateTime.length === 16 ? dateTime + ':00' : dateTime, timezone, text, draft },
            { onFinish: () => { setProcessing(false); onClose(); } },
        );
    }

    const canSubmit = !processing && selectedNetworks.length > 0 && !!dateTime && !!text.trim();

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Programar en Metricool
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    {piece.client?.name} — {piece.title ?? piece.concept ?? piece.product ?? 'Sin concepto'}
                </p>

                {loading && (
                    <p className="py-4 text-center text-sm text-muted-foreground">Cargando redes...</p>
                )}

                {fetchError && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {fetchError}
                    </div>
                )}

                {!loading && !fetchError && (
                    <form id="metricool-schedule-form" onSubmit={submit} className="space-y-4 pt-1">
                        <div className="space-y-2">
                            <Label>Redes sociales</Label>
                            {networks.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No hay redes conectadas para este cliente en Metricool.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {networks.map((n) => (
                                        <button
                                            key={n.network}
                                            type="button"
                                            onClick={() => toggleNetwork(n.network)}
                                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                                selectedNetworks.includes(n.network)
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border bg-background text-foreground hover:border-primary/60'
                                            }`}
                                        >
                                            {n.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Fecha y hora de publicación
                            </Label>
                            <Input
                                type="datetime-local"
                                value={dateTime}
                                onChange={(e) => setDateTime(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>Copy</Label>
                            <textarea
                                className="min-h-[100px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Texto del post..."
                            />
                        </div>

                        {piece.final_video_link ? (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Video className="h-3.5 w-3.5" />
                                Se adjuntará el video final (Drive) al post.
                            </p>
                        ) : (
                            <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Esta pieza no tiene video final cargado — se enviará sin video.
                            </p>
                        )}

                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={draft}
                                onChange={(e) => setDraft(e.target.checked)}
                                className="h-4 w-4 rounded border-input accent-primary"
                            />
                            Guardar como borrador (no publicar automáticamente)
                        </label>
                    </form>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="metricool-schedule-form"
                        disabled={!canSubmit || loading || !!fetchError}
                    >
                        <Send className="mr-1.5 h-4 w-4" />
                        {processing ? 'Enviando...' : draft ? 'Guardar borrador' : 'Programar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
