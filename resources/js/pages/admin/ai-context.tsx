import { Head, router, useForm } from '@inertiajs/react';
import { Globe, Save, Sparkles, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ClientRow = { id: number; name: string; ai_context: string | null };

type Props = {
    clients: ClientRow[];
    globalContext: string;
};

export default function AiContextPage({ clients, globalContext }: Props) {
    const [selectedClientId, setSelectedClientId] = useState('');

    const globalForm = useForm({ context: globalContext });
    const clientForm = useForm({ ai_context: '' });

    const selectedClient = clients.find((c) => String(c.id) === selectedClientId) ?? null;

    function handleClientChange(id: string) {
        setSelectedClientId(id);
        const c = clients.find((c) => String(c.id) === id);
        clientForm.setData('ai_context', c?.ai_context ?? '');
    }

    function saveGlobal(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        globalForm.post('/admin/ai-context/global');
    }

    function saveClient(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!selectedClientId) return;
        router.patch(`/admin/ai-context/client/${selectedClientId}`, { ai_context: clientForm.data.ai_context });
    }

    return (
        <>
            <Head title="Contexto IA" />

            <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-purple-400" />
                        Contexto de IA
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        El contexto global se aplica a todos los clientes. El contexto específico se concatena después para personalizar el perfil.
                    </p>
                </div>

                {/* Contexto global */}
                <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Globe className="h-4 w-4 text-blue-400" />
                            Contexto global
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">Se incluye en todos los prompts de Gemini, antes del contexto específico del cliente.</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={saveGlobal} className="space-y-3">
                            <textarea
                                value={globalForm.data.context}
                                onChange={(e) => globalForm.setData('context', e.target.value)}
                                placeholder="Ej: Somos Little Ninjas, una agencia de publicidad en video para marcas argentinas. Nuestro estilo es directo, con lenguaje coloquial porteño..."
                                className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            {globalForm.errors.context && (
                                <p className="text-xs text-destructive">{globalForm.errors.context}</p>
                            )}
                            <Button type="submit" disabled={globalForm.processing} size="sm">
                                <Save className="mr-2 h-3.5 w-3.5" />
                                {globalForm.processing ? 'Guardando...' : 'Guardar contexto global'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Contexto por cliente */}
                <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <User className="h-4 w-4 text-green-400" />
                            Contexto por cliente
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">Se agrega después del contexto global para personalizar el perfil de marca del cliente.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Cliente</Label>
                            <Select value={selectedClientId} onValueChange={handleClientChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccioná un cliente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            <span className="flex items-center gap-2">
                                                {c.name}
                                                {c.ai_context && (
                                                    <span className="text-xs text-green-400">● contexto cargado</span>
                                                )}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedClient && (
                            <form onSubmit={saveClient} className="space-y-3">
                                <textarea
                                    value={clientForm.data.ai_context}
                                    onChange={(e) => clientForm.setData('ai_context', e.target.value)}
                                    placeholder={`Contexto específico de ${selectedClient.name}. Ej: marca de skincare natural, público femenino 25-40, tono suave y empático...`}
                                    className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                                <div className="flex gap-2">
                                    <Button type="submit" size="sm">
                                        <Save className="mr-2 h-3.5 w-3.5" />
                                        Guardar contexto de {selectedClient.name}
                                    </Button>
                                    {clientForm.data.ai_context && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => {
                                                clientForm.setData('ai_context', '');
                                                router.patch(`/admin/ai-context/client/${selectedClientId}`, { ai_context: '' });
                                            }}
                                        >
                                            Borrar contexto
                                        </Button>
                                    )}
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
