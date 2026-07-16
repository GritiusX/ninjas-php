import { Head, usePage } from '@inertiajs/react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { Auth } from '@/types';

type LogEntry = {
    timestamp: string;
    message: string;
    exception: string | null;
    file: string | null;
    url: string | null;
    method: string | null;
    user: string | null;
    trace: string | null;
};

type Props = { entries: LogEntry[] };

function LogRow({ entry, showDetail }: { entry: LogEntry; showDetail: boolean }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            >
                <span className="mt-1 shrink-0 text-muted-foreground">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{entry.timestamp}</span>
                        {entry.method && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">{entry.method}</Badge>
                        )}
                        {entry.user && (
                            <span className="text-xs text-blue-400">{entry.user}</span>
                        )}
                    </div>
                    <p className={`text-sm text-foreground font-medium ${open ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                        {entry.message}
                    </p>
                    {entry.exception && (
                        <p className="text-xs text-orange-400 font-mono">{entry.exception}</p>
                    )}
                    {!open && entry.url && (
                        <p className="text-xs text-muted-foreground truncate">{entry.url}</p>
                    )}
                </div>
            </button>

            {open && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                    {entry.url && (
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">URL</p>
                            <p className="text-xs font-mono text-foreground break-all">{entry.url}</p>
                        </div>
                    )}
                    {showDetail && entry.file && (
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Archivo</p>
                            <p className="text-xs font-mono text-foreground break-all">{entry.file}</p>
                        </div>
                    )}
                    {showDetail && entry.trace && (
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Traceback</p>
                            <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed overflow-x-auto">
                                {entry.trace}
                            </pre>
                        </div>
                    )}
                    {!showDetail && (entry.file || entry.trace) && (
                        <p className="text-xs text-muted-foreground italic">
                            El detalle completo (traceback y archivo) solo está disponible para super admin.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ErrorLogsPage({ entries }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const isSuperAdmin = auth?.user?.role === 'superadmin';

    return (
        <>
            <Head title="Logs de errores" />

            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <AlertTriangle className="h-6 w-6 text-orange-400" />
                            Logs de errores
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Ultimos {entries.length} errores · Se guardan por 30 dias
                            {isSuperAdmin && ' · Vista completa (super admin)'}
                        </p>
                    </div>
                </div>

                {entries.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-12 text-center">
                        <p className="text-muted-foreground text-sm">No hay errores registrados.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {entries.map((entry, i) => (
                            <LogRow key={i} entry={entry} showDetail={isSuperAdmin} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
