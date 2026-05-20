import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as clientRoutes from '@/routes/admin/clients';

export default function ClientCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '', whatsapp_number: '', roas_goal: '3.00', meta_ad_account_id: '', metricool_blog_id: '',
    });

    function submit(e: React.FormEvent) { e.preventDefault(); post(clientRoutes.store.url()); }

    return (
        <>
            <Head title="Nuevo cliente" />
            <div className="mx-auto max-w-xl px-4 py-6 space-y-5">
                <div className="flex items-center gap-3">
                    <Link href={clientRoutes.index()}>
                        <Button variant="ghost" size="sm" className="text-muted-foreground"><ArrowLeft className="h-4 w-4 mr-1" />Clientes</Button>
                    </Link>
                    <h1 className="text-xl font-bold text-foreground">Nuevo cliente</h1>
                </div>
                <Card className="bg-card border-border">
                    <CardContent className="pt-5">
                        <form onSubmit={submit} className="space-y-4">
                            <Field label="Nombre *" error={errors.name}>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Café Gourmet BA" autoFocus />
                            </Field>
                            <Field label="WhatsApp del cliente" error={errors.whatsapp_number}>
                                <Input value={data.whatsapp_number} onChange={(e) => setData('whatsapp_number', e.target.value)} placeholder="+54 9 11..." />
                            </Field>
                            <Field label="ROAS objetivo *" error={errors.roas_goal}>
                                <Input type="number" step="0.01" min="0" value={data.roas_goal} onChange={(e) => setData('roas_goal', e.target.value)} />
                            </Field>
                            <Field label="Meta Ad Account ID" error={errors.meta_ad_account_id}>
                                <Input value={data.meta_ad_account_id} onChange={(e) => setData('meta_ad_account_id', e.target.value)} placeholder="act_123456789" className="font-mono" />
                            </Field>
                            <Field label="Metricool blog ID" error={errors.metricool_blog_id}>
                                <Input value={data.metricool_blog_id} onChange={(e) => setData('metricool_blog_id', e.target.value)} placeholder="3107640" className="font-mono" />
                            </Field>
                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={processing}><Save className="mr-1.5 h-4 w-4" />Crear cliente</Button>
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
