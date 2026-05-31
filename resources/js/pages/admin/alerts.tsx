import { Head, router } from '@inertiajs/react';
import { Bell, Users } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { Client } from '@/types';

type AlertConfigRow = {
    id: number;
    alert_type: string;
    client_id: number | null;
    is_enabled: boolean;
    threshold_value: number | null;
    notify_admin: boolean;
    notify_pm: boolean;
};

type Props = {
    clients: Client[];
    globalConfigs: Record<string, AlertConfigRow>;
    clientConfigs: Record<string, Record<string, AlertConfigRow>>;
};

const GLOBAL_ALERT_META: Record<string, { label: string; description: string; hasThreshold: boolean; thresholdLabel?: string }> = {
    editor_overload: {
        label: 'Sobrecarga de editores',
        description: 'Avisa a las 8:00 AM si un editor tiene X o más videos asignados para el día, e informa atrasados del día anterior.',
        hasThreshold: true,
        thresholdLabel: 'Cantidad de videos',
    },
    weekly_monday_pending: {
        label: 'Seguimiento lunes — pendientes',
        description: 'Los lunes alerta sobre todos los videos pendientes de la semana.',
        hasThreshold: false,
    },
    weekly_thursday_missing: {
        label: 'Seguimiento jueves — en riesgo',
        description: 'Los jueves alerta sobre los videos que aún están en producción y podrían no llegar a tiempo.',
        hasThreshold: false,
    },
    production_summary_monday: {
        label: 'Resumen de producción semanal',
        description: 'Los lunes envía un resumen con la cantidad de videos completados la semana anterior.',
        hasThreshold: false,
    },
};

const CLIENT_ALERT_META: Record<string, { label: string; description: string; hasThreshold: boolean; thresholdLabel?: string; thresholdPlaceholder?: string }> = {
    content_inactivity: {
        label: 'Inactividad de contenido',
        description: 'Alerta cuando no hay contenido programado publicado en los últimos X días.',
        hasThreshold: true,
        thresholdLabel: 'Días',
        thresholdPlaceholder: '3',
    },
    content_no_future: {
        label: 'Sin contenido futuro',
        description: 'Alerta cuando no quedan publicaciones futuras programadas.',
        hasThreshold: false,
    },
    campaign_no_spend: {
        label: 'Campaña sin inversión',
        description: 'Alerta cuando no se registra inversión publicitaria en los últimos X días.',
        hasThreshold: true,
        thresholdLabel: 'Días',
        thresholdPlaceholder: '3',
    },
    roas_below: {
        label: 'ROAS bajo',
        description: 'Alerta cuando el ROAS promedio de los últimos 5 días está por debajo del umbral. Si no se define, usa el objetivo del cliente.',
        hasThreshold: true,
        thresholdLabel: 'ROAS mínimo',
        thresholdPlaceholder: 'Ej: 2.5',
    },
};

function useUpdateConfig() {
    return (id: number, data: Partial<AlertConfigRow>) => {
        router.put(`/admin/alerts/${id}`, data, { preserveScroll: true });
    };
}

function GlobalAlertCard({ alertType, config }: { alertType: string; config: AlertConfigRow }) {
    const meta = GLOBAL_ALERT_META[alertType];
    const update = useUpdateConfig();
    const [threshold, setThreshold] = useState(String(config.threshold_value ?? ''));

    if (!meta) return null;

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{meta.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <Checkbox
                    checked={config.is_enabled}
                    onCheckedChange={(v) => update(config.id, { is_enabled: !!v })}
                />
            </div>

            <div className="flex flex-wrap items-center gap-4">
                {meta.hasThreshold && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{meta.thresholdLabel}:</span>
                        <Input
                            type="number"
                            className="h-7 w-20 text-xs"
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            onBlur={() => update(config.id, { threshold_value: threshold ? parseFloat(threshold) : null })}
                        />
                    </div>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.notify_admin}
                            onChange={(e) => update(config.id, { notify_admin: e.target.checked })}
                            className="h-3.5 w-3.5"
                        />
                        Admin
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.notify_pm}
                            onChange={(e) => update(config.id, { notify_pm: e.target.checked })}
                            className="h-3.5 w-3.5"
                        />
                        PM
                    </label>
                </div>
            </div>
        </div>
    );
}

function ClientAlertRow({
    client,
    configs,
}: {
    client: Client;
    configs: Record<string, AlertConfigRow>;
}) {
    const update = useUpdateConfig();

    return (
        <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
                <p className="text-sm font-semibold text-foreground">{client.name}</p>
            </div>
            <div className="divide-y divide-border">
                {Object.entries(CLIENT_ALERT_META).map(([type, meta]) => {
                    const config = configs[type];
                    if (!config) return null;

                    return (
                        <ClientAlertTypeRow
                            key={type}
                            meta={meta}
                            config={config}
                            onUpdate={(data) => update(config.id, data)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function ClientAlertTypeRow({
    meta,
    config,
    onUpdate,
}: {
    meta: (typeof CLIENT_ALERT_META)[string];
    config: AlertConfigRow;
    onUpdate: (data: Partial<AlertConfigRow>) => void;
}) {
    const [threshold, setThreshold] = useState(String(config.threshold_value ?? ''));

    return (
        <div className="flex flex-wrap items-center gap-4 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <Checkbox
                    checked={config.is_enabled}
                    onCheckedChange={(v) => onUpdate({ is_enabled: !!v })}
                />
                <div className="min-w-0">
                    <p className="text-sm text-foreground">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-4">
                {meta.hasThreshold && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{meta.thresholdLabel}:</span>
                        <Input
                            type="number"
                            step="0.01"
                            className="h-7 w-20 text-xs"
                            value={threshold}
                            placeholder={meta.thresholdPlaceholder}
                            onChange={(e) => setThreshold(e.target.value)}
                            onBlur={() => onUpdate({ threshold_value: threshold ? parseFloat(threshold) : null })}
                        />
                    </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                            type="checkbox"
                            checked={config.notify_admin}
                            onChange={(e) => onUpdate({ notify_admin: e.target.checked })}
                            className="h-3.5 w-3.5"
                        />
                        Admin
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                            type="checkbox"
                            checked={config.notify_pm}
                            onChange={(e) => onUpdate({ notify_pm: e.target.checked })}
                            className="h-3.5 w-3.5"
                        />
                        PM
                    </label>
                </div>
            </div>
        </div>
    );
}

export default function AlertsPage({ clients, globalConfigs, clientConfigs }: Props) {
    return (
        <>
            <Head title="Configuración de alertas" />

            <div className="space-y-8 px-4 py-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
                    <p className="mt-0.5 text-muted-foreground">
                        Configurá qué alertas se envían, a quién y con qué umbrales.
                    </p>
                </div>

                {/* Alertas globales */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                            Alertas globales
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {Object.keys(GLOBAL_ALERT_META).map((type) =>
                            globalConfigs[type] ? (
                                <GlobalAlertCard
                                    key={type}
                                    alertType={type}
                                    config={globalConfigs[type]}
                                />
                            ) : null,
                        )}
                    </div>
                </section>

                {/* Alertas por cliente */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                            Alertas por cliente
                        </h2>
                        <Badge className="bg-secondary text-secondary-foreground">{clients.length}</Badge>
                    </div>
                    <div className="space-y-4">
                        {clients.map((client) => (
                            <ClientAlertRow
                                key={client.id}
                                client={client}
                                configs={clientConfigs[String(client.id)] ?? {}}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
}
