import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, ChevronRight, Clock, ClipboardList } from 'lucide-react';
import { PriorityBadge } from '@/components/priority-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ContentPiece } from '@/types';

function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    return `Hace ${Math.floor(diff / 86400)}d`;
}

export default function ReviewList({ pieces }: { pieces: ContentPiece[] }) {
    return (
        <>
            <Head title="Revisión interna" />

            <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
                <div className="flex items-center gap-3">
                    <ClipboardList className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Revisión interna</h1>
                        <p className="text-sm text-muted-foreground">
                            {pieces.length === 0
                                ? 'No hay piezas esperando revisión.'
                                : `${pieces.length} ${pieces.length === 1 ? 'pieza lista' : 'piezas listas'} para revisar`}
                        </p>
                    </div>
                </div>

                {pieces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                        <p className="text-lg font-medium text-foreground">Todo revisado</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            No hay piezas esperando tu revisión.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pieces.map((piece) => (
                            <Card key={piece.id} className="border-border bg-card hover:bg-muted/30 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                    {piece.client?.name}
                                                </span>
                                                <PriorityBadge priority={piece.priority} />
                                            </div>

                                            <p className="font-medium text-foreground truncate">
                                                {piece.concept ?? piece.product ?? 'Sin concepto'}
                                            </p>

                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                {piece.editor && (
                                                    <span>Editor: {piece.editor.name}</span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {timeAgo(piece.updated_at)}
                                                </span>
                                            </div>
                                        </div>

                                        <Link href={`/pm/review/${piece.id}`} className="shrink-0">
                                            <Button size="sm">
                                                Revisar
                                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
