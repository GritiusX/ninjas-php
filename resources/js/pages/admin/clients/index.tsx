import { Head, Link, router, useForm } from '@inertiajs/react';
import { Link2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import * as clientRoutes from '@/routes/admin/clients';
import type { Client } from '@/types';

type GoogleAccount = { id: string; name: string; currency: string };
type Mapping = { customer_id: string; client_id: string };

function GoogleAdsDialog({ clients, onClose }: { clients: Client[]; onClose: () => void }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const { post, transform, processing } = useForm<{ mappings: Mapping[] }>({ mappings: [] });

    // Fetch accounts cuando el dialog abre
    useState(() => {
        fetch('/google-ads/accounts/data', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data) => {
                if (data.error) { setError(data.error); return; }
                const accs: GoogleAccount[] = data.accounts ?? [];
                setAccounts(accs);
                setMappings(accs.map((ga) => {
                    const matched = clients.find((c) => c.google_ads_customer_id === ga.id);
                    return { customer_id: ga.id, client_id: matched ? String(matched.id) : 'none' };
                }));
            })
            .catch(() => setError('Error al conectar con el servidor.'))
            .finally(() => setLoading(false));
    });

    function setClientId(index: number, clientId: string) {
        setMappings((prev) => prev.map((m, i) => i === index ? { ...m, client_id: clientId } : m));
    }

    transform(() => ({
        mappings: mappings.filter((m) => m.client_id && m.client_id !== 'none'),
    }));

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/google-ads/accounts/map', { onSuccess: onClose });
    }

    return (
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Vincular cuentas de Google Ads
                </DialogTitle>
            </DialogHeader>

            {loading && (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Consultando la MCC...
                </div>
            )}

            {error && (
                <p className="py-6 text-center text-sm text-destructive">{error}</p>
            )}

            {!loading && !error && (
                <form id="gads-map-form" onSubmit={submit} className="space-y-3 py-2">
                    {accounts.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-6">
                            No se encontraron cuentas activas bajo la MCC.
                        </p>
                    )}
                    {accounts.map((ga, i) => (
                        <div key={ga.id} className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{ga.name}</p>
                                <p className="text-xs font-mono text-muted-foreground">
                                    {ga.id.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')} · {ga.currency}
                                </p>
                            </div>
                            <Select
                                value={mappings[i]?.client_id ?? 'none'}
                                onValueChange={(v) => setClientId(i, v)}
                            >
                                <SelectTrigger className="w-44 shrink-0">
                                    <SelectValue placeholder="Sin mapear" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin mapear</SelectItem>
                                    {clients.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </form>
            )}

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={processing}>Cancelar</Button>
                {!loading && !error && accounts.length > 0 && (
                    <Button type="submit" form="gads-map-form" disabled={processing}>
                        {processing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Link2 className="mr-1.5 h-4 w-4" />}
                        {processing ? 'Guardando...' : 'Guardar'}
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
    );
}

export default function ClientsIndex({ clients }: { clients: Client[] }) {
    const [gadsOpen, setGadsOpen] = useState(false);
    const [pending, setPending] = useState<{ id: number; name: string } | null>(null);

    function handleConfirmDestroy() {
        if (!pending) return;
        router.delete(clientRoutes.destroy.url(pending.id));
        setPending(null);
    }

    return (
        <>
            <Head title="Clientes" />
            <div className="space-y-5 px-4 py-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setGadsOpen(true)}>
                            <Link2 className="mr-1.5 h-4 w-4" />
                            Vincular Google Ads
                        </Button>
                        <Link href={clientRoutes.create()}>
                            <Button size="sm">
                                <Plus className="mr-1.5 h-4 w-4" />
                                Nuevo cliente
                            </Button>
                        </Link>
                    </div>
                </div>

                <Card className="border-border bg-card">
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-xs tracking-wider text-muted-foreground uppercase">
                                    <th className="px-4 py-3 text-left">Cliente</th>
                                    <th className="px-4 py-3 text-left">WhatsApp</th>
                                    <th className="px-4 py-3 text-left">ROAS goal</th>
                                    <th className="px-4 py-3 text-left">Meta Ad Account</th>
                                    <th className="px-4 py-3 text-left">Google Ads ID</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {clients.map((c) => (
                                    <tr key={c.id} className="transition-colors hover:bg-muted/40">
                                        <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">{c.whatsapp_number ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-amber-400">{Number(c.roas_goal).toFixed(2)}</span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.meta_ad_account_id ?? '—'}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {c.google_ads_customer_id
                                                ? c.google_ads_customer_id.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={clientRoutes.edit.url(c.id)}>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400" onClick={() => setPending({ id: c.id, name: c.name })}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {clients.length === 0 && (
                            <p className="py-10 text-center text-muted-foreground">No hay clientes.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={gadsOpen} onOpenChange={(v) => !v && setGadsOpen(false)}>
                {gadsOpen && <GoogleAdsDialog clients={clients} onClose={() => setGadsOpen(false)} />}
            </Dialog>

            <ConfirmDialog
                open={!!pending}
                title={`¿Eliminar a ${pending?.name}?`}
                description="Se eliminarán todas sus piezas y métricas. Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                onConfirm={handleConfirmDestroy}
                onCancel={() => setPending(null)}
            />
        </>
    );
}
