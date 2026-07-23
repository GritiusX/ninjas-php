import { Head } from '@inertiajs/react';
import { useState } from 'react';

type Screenshot = {
    filename: string;
    label: string;
    datetime: string | null;
    sort_key: string;
};

type Props = {
    screenshots: Screenshot[];
};

const LABEL_COLOR: Record<string, string> = {
    'facebook-evolution-ok': 'bg-blue-600',
    'instagram-evolution-ok': 'bg-pink-600',
    'tiktok-evolution-ok': 'bg-neutral-800',
    'youtube-evolution-ok': 'bg-red-600',
    'googleAds-evolution-ok': 'bg-yellow-600',
    'after-date-selection': 'bg-green-700',
    'login-failed': 'bg-rose-700',
};

function labelColor(label: string): string {
    for (const [key, cls] of Object.entries(LABEL_COLOR)) {
        if (label.startsWith(key)) return cls;
    }
    if (label.includes('failed') || label.includes('error')) return 'bg-rose-700';
    return 'bg-neutral-600';
}

export default function MetricoolDebug({ screenshots }: Props) {
    const [selected, setSelected] = useState<Screenshot | null>(null);
    const [filter, setFilter] = useState('');

    const filtered = filter
        ? screenshots.filter(s => s.label.toLowerCase().includes(filter.toLowerCase()))
        : screenshots;

    function imageUrl(filename: string) {
        return `/admin/metricool-debug/image?file=${encodeURIComponent(filename)}`;
    }

    return (
        <>
            <Head title="Metricool Debug Screenshots" />
            <div className="min-h-screen bg-neutral-950 text-white p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-xl font-semibold">Metricool Debug Screenshots</h1>
                            <p className="text-sm text-neutral-400 mt-0.5">{screenshots.length} imágenes — más recientes primero</p>
                        </div>
                        <input
                            type="text"
                            placeholder="Filtrar por label..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-neutral-500"
                        />
                    </div>

                    {filtered.length === 0 && (
                        <p className="text-neutral-500 text-sm">No hay screenshots.</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filtered.map(s => (
                            <button
                                key={s.filename}
                                onClick={() => setSelected(s)}
                                className="group text-left bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-600 transition-colors"
                            >
                                <div className="aspect-video bg-neutral-800 overflow-hidden">
                                    <img
                                        src={imageUrl(s.filename)}
                                        alt={s.label}
                                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-200"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="p-2.5">
                                    <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium text-white mb-1 ${labelColor(s.label)}`}>
                                        {s.label}
                                    </span>
                                    {s.datetime && (
                                        <p className="text-xs text-neutral-500">{s.datetime}</p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {selected && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex flex-col"
                    onClick={() => setSelected(null)}
                >
                    <div className="flex items-center justify-between px-6 py-3 bg-neutral-900/80 backdrop-blur">
                        <div>
                            <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium text-white mr-2 ${labelColor(selected.label)}`}>
                                {selected.label}
                            </span>
                            {selected.datetime && (
                                <span className="text-sm text-neutral-400">{selected.datetime}</span>
                            )}
                        </div>
                        <div className="flex gap-3 items-center">
                            <a
                                href={imageUrl(selected.filename)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                Abrir en nueva pestaña
                            </a>
                            <button
                                onClick={() => setSelected(null)}
                                className="text-neutral-400 hover:text-white text-lg leading-none"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    <div
                        className="flex-1 overflow-auto p-4 flex items-start justify-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <img
                            src={imageUrl(selected.filename)}
                            alt={selected.label}
                            className="max-w-full rounded shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
