import { Head, useForm } from '@inertiajs/react';
import { Link2, Save, Unlink } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type GoogleAccount = { id: string; name: string; currency: string };
type Client = { id: number; name: string; google_ads_customer_id: string | null };

type Props = {
    google_accounts: GoogleAccount[];
    clients: Client[];
    connected: boolean;
};

export default function GoogleAdsAccounts({ google_accounts, clients, connected }: Props) {
    const initialMappings = google_accounts.map((ga) => {
        const matched = clients.find((c) => c.google_ads_customer_id === ga.id);
        return { customer_id: ga.id, client_id: matched ? String(matched.id) : '' };
    });

    const { data, setData, post, transform, processing } = useForm<{
        mappings: { customer_id: string; client_id: string }[];
    }>({ mappings: initialMappings });

    transform((d) => ({
        mappings: d.mappings.filter((m) => m.client_id && m.client_id !== 'none'),
    }));

    function setClientId(index: number, clientId: string) {
        const next = [...data.mappings];
        next[index] = { ...next[index], client_id: clientId };
        setData('mappings', next);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/google-ads/accounts/map');
    }

    if (!connected) {
        return (
            <>
                <Head title="Google Ads — Cuentas" />
                <div className="flex min-h-screen items-center justify-center">
                    <div className="text-center space-y-4">
                        <Unlink className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="text-foreground font-medium">Google Ads no está conectado aún.</p>
                        <a href="/google-ads/connect">
                            <Button>Conectar Google Ads</Button>
                        </a>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Google Ads — Cuentas" />
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Cuentas de Google Ads</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Mapeá cada cuenta de Google Ads con el cliente correspondiente en el sistema.
                    </p>
                </div>

                {google_accounts.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                            No se encontraron cuentas activas bajo la MCC.
                        </CardContent>
                    </Card>
                ) : (
                    <form onSubmit={submit} className="space-y-3">
                        {google_accounts.map((ga, i) => (
                            <Card key={ga.id} className="border-border bg-card">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-foreground truncate">{ga.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">
                                            {ga.id.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')} · {ga.currency}
                                        </p>
                                    </div>
                                    <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="w-52 shrink-0">
                                        <Select
                                            value={data.mappings[i]?.client_id || 'none'}
                                            onValueChange={(v) => setClientId(i, v)}
                                        >
                                            <SelectTrigger>
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
                                </CardContent>
                            </Card>
                        ))}

                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={processing}>
                                <Save className="mr-1.5 h-4 w-4" />
                                {processing ? 'Guardando...' : 'Guardar mappings'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </>
    );
}
