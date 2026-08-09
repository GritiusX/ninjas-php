import { ChevronDown, Download, FilePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type MetricoolReport = {
    jobId: string;
    from: string | null;
    to: string | null;
    reportType: string | null;
    creationDate: string | null;
};

export function MetricoolReportsButton({ clientId, period }: { clientId: number; period: string }) {
    const [open, setOpen]           = useState(false);
    const [loading, setLoading]     = useState(false);
    const [reports, setReports]     = useState<MetricoolReport[] | null>(null);
    const [error, setError]         = useState<string | null>(null);
    const [creating, setCreating]   = useState(false);
    const [createMsg, setCreateMsg] = useState<string | null>(null);
    // El mes a generar es independiente del período que esté mirando la
    // página (acá se puede elegir cualquier mes, no solo el que ya tenga
    // datos sincronizados) — "period" solo se usa como valor inicial.
    const [targetPeriod, setTargetPeriod] = useState(period);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function toggle() {
        if (!open && reports === null) {
            setLoading(true);
            setError(null);
            fetch(`/metrics/${clientId}/metricool-reports`)
                .then((r) => r.json())
                .then((data) => {
                    setReports(Array.isArray(data) ? data : []);
                    setLoading(false);
                })
                .catch(() => {
                    setError('No se pudo cargar la lista.');
                    setLoading(false);
                });
        }
        setOpen((v) => !v);
    }

    function createReport() {
        if (!targetPeriod) return;

        setCreating(true);
        setCreateMsg('Iniciando generación...');
        const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

        fetch(`/metrics/${clientId}/metricool-report-create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
            body: JSON.stringify({ period: targetPeriod }),
        })
            .then((r) => r.json())
            .then(() => {
                setCreateMsg('Generando PDF... (puede tardar ~1 min)');
                pollForNewReport();
            })
            .catch(() => {
                setCreateMsg('Error al iniciar la generación.');
                setCreating(false);
            });
    }

    function pollForNewReport() {
        const started   = Date.now();
        const maxMs     = 3 * 60 * 1000; // 3 min máximo
        const intervalMs = 6_000;

        // snapshot del jobId más reciente antes de crear
        const prevLatest = reports?.[0]?.jobId ?? null;

        const timer = setInterval(() => {
            if (Date.now() - started > maxMs) {
                clearInterval(timer);
                setCreateMsg('El reporte tardó más de lo esperado. Revisá la lista manualmente.');
                setCreating(false);
                setReports(null);
                return;
            }

            fetch(`/metrics/${clientId}/metricool-reports`)
                .then((r) => r.json())
                .then((data: MetricoolReport[]) => {
                    const list = Array.isArray(data) ? data : [];
                    const newLatest = list[0]?.jobId ?? null;
                    if (newLatest && newLatest !== prevLatest) {
                        clearInterval(timer);
                        setReports(list);
                        setCreateMsg(`Reporte ${targetPeriod} listo. Ya podés descargarlo.`);
                        setCreating(false);
                    }
                })
                .catch(() => { /* silencioso, sigue intentando */ });
        }, intervalMs);
    }

    function formatPeriod(r: MetricoolReport) {
        if (r.from && r.to) return `${r.from} → ${r.to}`;
        if (r.creationDate) return r.creationDate.slice(0, 10);
        return r.jobId.slice(0, 24);
    }

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={toggle}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-secondary px-3 text-sm text-secondary-foreground hover:bg-secondary/80"
            >
                <Download className="h-4 w-4" />
                Reportes Metricool
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-10 z-50 w-72 rounded-md border border-border bg-popover shadow-md">
                    {/* Generar nuevo reporte — mes elegible libremente, no depende del período que esté mirando la página */}
                    <div className="border-b border-border px-3 py-2.5 space-y-2">
                        <input
                            type="month"
                            value={targetPeriod}
                            onChange={(e) => setTargetPeriod(e.target.value)}
                            disabled={creating}
                            className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground disabled:opacity-50"
                        />
                        <button
                            type="button"
                            disabled={creating || !targetPeriod}
                            onClick={createReport}
                            className="flex w-full items-center gap-2 rounded px-1 py-1 text-sm text-foreground hover:bg-muted disabled:opacity-50"
                        >
                            <FilePlus className={`h-3.5 w-3.5 shrink-0 text-primary ${creating ? 'animate-pulse' : ''}`} />
                            <span>{creating ? 'Generando...' : `Generar reporte ${targetPeriod}`}</span>
                        </button>
                        {createMsg && (
                            <p className={`mt-1.5 px-1 text-xs ${createMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                                {createMsg}
                            </p>
                        )}
                    </div>

                    {/* Lista de reportes existentes */}
                    {loading && (
                        <p className="px-4 py-3 text-sm text-muted-foreground">Cargando...</p>
                    )}
                    {error && (
                        <p className="px-4 py-3 text-sm text-red-400">{error}</p>
                    )}
                    {!loading && !error && reports?.length === 0 && (
                        <p className="px-4 py-3 text-sm text-muted-foreground">Sin reportes disponibles.</p>
                    )}
                    {!loading && !error && reports && reports.length > 0 && (
                        <ul className="max-h-64 overflow-y-auto py-1">
                            {reports.map((r) => (
                                <li key={r.jobId}>
                                    <a
                                        href={`/metrics/${clientId}/metricool-report-download?jobId=${encodeURIComponent(r.jobId)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted"
                                        onClick={() => setOpen(false)}
                                    >
                                        <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        <span className="truncate">{formatPeriod(r)}</span>
                                        {r.reportType && (
                                            <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                {r.reportType}
                                            </span>
                                        )}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
