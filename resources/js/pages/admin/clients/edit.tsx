import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as clientRoutes from '@/routes/admin/clients';
import type { Client } from '@/types';

const ALL_NETWORKS: { key: string; label: string; badge: string; color: string }[] = [
    { key: 'facebook',  label: 'Facebook',   badge: 'FB', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { key: 'instagram', label: 'Instagram',  badge: 'IG', color: 'bg-pink-100 text-pink-700 border-pink-300' },
    { key: 'tiktok',    label: 'TikTok',     badge: 'TT', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { key: 'youtube',   label: 'YouTube',    badge: 'YT', color: 'bg-red-100 text-red-700 border-red-300' },
    { key: 'googleAds', label: 'Google Ads', badge: 'GA', color: 'bg-green-100 text-green-700 border-green-300' },
    { key: 'metaAds',   label: 'Meta Ads',   badge: 'MA', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
];

export default function ClientEdit({ client }: { client: Client }) {
    const [showToken, setShowToken] = useState(false);
    const [pendingNetwork, setPendingNetwork] = useState<string | null>(null);
    const whatsappRef = useRef<HTMLDivElement>(null);
    const highlightWhatsapp = typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('highlight') === 'whatsapp';

    useEffect(() => {
        if (highlightWhatsapp && whatsappRef.current) {
            whatsappRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, []);
    const { data, setData, put, processing, errors } = useForm({
        name: client.name,
        contact_name: client.contact_name ?? '',
        contact_email: client.contact_email ?? '',
        whatsapp_number: client.whatsapp_number ?? '',
        roas_goal: String(client.roas_goal),
        meta_ad_account_id: client.meta_ad_account_id ?? '',
        meta_access_token: '',
        metricool_blog_id: client.metricool_blog_id ?? '',
        metricool_networks: (client.metricool_networks ?? []) as string[],
        google_ads_customer_id: client.google_ads_customer_id ?? '',
    });

    function toggleNetwork(key: string) {
        const active = data.metricool_networks.includes(key);
        if (active) {
            setData('metricool_networks', data.metricool_networks.filter((n) => n !== key));
        } else {
            setPendingNetwork(key);
        }
    }

    function confirmEnableNetwork() {
        if (!pendingNetwork) return;
        setData('metricool_networks', [...data.metricool_networks, pendingNetwork]);
        setPendingNetwork(null);
    }

    function submit(e: React.FormEvent) { e.preventDefault(); put(clientRoutes.update.url(client.id)); }

    return (
        <>
            <Head title={`Editar — ${client.name}`} />
            <div className="mx-auto max-w-xl px-4 py-6 space-y-5">
                <div className="flex items-center gap-3">
                    <Link href={clientRoutes.index()}>
                        <Button variant="ghost" size="sm" className="text-muted-foreground"><ArrowLeft className="h-4 w-4 mr-1" />Clientes</Button>
                    </Link>
                    <h1 className="text-xl font-bold text-foreground">Editar cliente</h1>
                </div>
                <Card className="bg-card border-border">
                    <CardContent className="pt-5">
                        <form onSubmit={submit} className="space-y-4">
                            <Field label="Nombre *" error={errors.name}>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} />
                            </Field>

                            <div className="pt-1 pb-0.5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contacto del responsable</p>
                            </div>
                            <Field label="Nombre del responsable" error={errors.contact_name}>
                                <Input value={data.contact_name} onChange={(e) => setData('contact_name', e.target.value)} placeholder="Juan Pérez" />
                            </Field>
                            <Field label="Email del responsable" error={errors.contact_email}>
                                <Input type="email" value={data.contact_email} onChange={(e) => setData('contact_email', e.target.value)} placeholder="juan@empresa.com" />
                            </Field>
                            <div ref={whatsappRef} className={highlightWhatsapp ? 'rounded-lg ring-2 ring-green-500 ring-offset-2 ring-offset-background p-3 -mx-3 bg-green-500/5' : ''}>
                                <Field
                                    label="WhatsApp del responsable"
                                    error={errors.whatsapp_number}
                                    highlight={highlightWhatsapp}
                                >
                                    <Input value={data.whatsapp_number} onChange={(e) => setData('whatsapp_number', e.target.value)} placeholder="+54 9 11..." className={highlightWhatsapp ? 'border-green-500 focus-visible:ring-green-500' : ''} />
                                </Field>
                                {highlightWhatsapp && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                                        ↑ Agregá el número de WhatsApp del cliente acá
                                    </p>
                                )}
                            </div>
                            <Field label="ROAS objetivo *" error={errors.roas_goal}>
                                <Input type="number" step="0.01" min="0" value={data.roas_goal} onChange={(e) => setData('roas_goal', e.target.value)} />
                            </Field>
                            <Field label="Meta Ad Account ID" error={errors.meta_ad_account_id}>
                                <Input value={data.meta_ad_account_id} onChange={(e) => setData('meta_ad_account_id', e.target.value)} placeholder="act_123456789" className="font-mono" />
                            </Field>
                            <Field label="Meta Access Token" error={errors.meta_access_token}>
                                <div className="relative">
                                    <Input
                                        type={showToken ? 'text' : 'password'}
                                        value={data.meta_access_token}
                                        onChange={(e) => setData('meta_access_token', e.target.value)}
                                        placeholder={client.meta_access_token ? '••••••••  (dejar vacío para no cambiar)' : 'EAAxxxxx...'}
                                        className="font-mono pr-10"
                                    />
                                    <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {client.meta_access_token && <p className="text-xs text-muted-foreground mt-1">Token guardado. Dejá vacío para mantenerlo.</p>}
                            </Field>
                            <Field label="Metricool blog ID" error={errors.metricool_blog_id}>
                                <Input value={data.metricool_blog_id} onChange={(e) => setData('metricool_blog_id', e.target.value)} placeholder="3107640" className="font-mono" />
                            </Field>
                            <div className="space-y-1.5">
                                <Label>Redes Metricool</Label>
                                <div className="flex flex-wrap gap-2 pt-0.5">
                                    {ALL_NETWORKS.map((net) => {
                                        const active = data.metricool_networks.includes(net.key);
                                        return (
                                            <button
                                                key={net.key}
                                                type="button"
                                                onClick={() => toggleNetwork(net.key)}
                                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-opacity ${active ? net.color : 'bg-muted text-muted-foreground border-border opacity-50'}`}
                                                title={active ? `Deshabilitar ${net.label}` : `Habilitar ${net.label}`}
                                            >
                                                {net.badge} {net.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Activá solo las redes que este cliente tiene conectadas en Metricool.
                                </p>
                            </div>
                            <Field label="Google Ads Customer ID" error={errors.google_ads_customer_id}>
                                <Input value={data.google_ads_customer_id} onChange={(e) => setData('google_ads_customer_id', e.target.value)} placeholder="511-066-6812" className="font-mono" />
                            </Field>
                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={processing}><Save className="mr-1.5 h-4 w-4" />Guardar cambios</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <Dialog open={pendingNetwork !== null} onOpenChange={(v) => !v && setPendingNetwork(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Habilitar red en Metricool</DialogTitle>
                    </DialogHeader>
                    {pendingNetwork && (() => {
                        const net = ALL_NETWORKS.find((n) => n.key === pendingNetwork)!;
                        return (
                            <p className="text-sm text-muted-foreground">
                                Estás por habilitar <span className="font-semibold text-foreground">{net.label}</span> para este cliente.
                                Metricool va a intentar obtener datos de esta red.{' '}
                                <span className="font-medium text-amber-600">Asegurate de que el cliente tiene su cuenta de {net.label} conectada en Metricool, de lo contrario la sincronización va a fallar.</span>
                            </p>
                        );
                    })()}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPendingNetwork(null)}>Cancelar</Button>
                        <Button onClick={confirmEnableNetwork}>Habilitar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function Field({ label, error, highlight, children }: { label: string; error?: string; highlight?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className={highlight ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
