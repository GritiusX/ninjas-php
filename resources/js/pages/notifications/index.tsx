import { Head, Link, router } from '@inertiajs/react';
import { Bell, BellOff, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import * as notifRoutes from '@/routes/notifications';
import type { AppNotification } from '@/types';

type Props = { notifications: AppNotification[] };

function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

const TYPE_ICONS: Record<string, string> = {
    'video.submitted':    '🎬',
    'changes.requested':  '✏️',
    'client.approved':    '✅',
    'client.changes':     '💬',
};

export default function NotificationsIndex({ notifications }: Props) {
    const unread = notifications.filter((n) => !n.read_at);

    function markRead(id: number) {
        router.post(notifRoutes.read.url(id), {}, { preserveScroll: true });
    }

    function markAllRead() {
        router.post(notifRoutes.readAll.url(), {}, { preserveScroll: true });
    }

    return (
        <>
            <Head title="Notificaciones" />

            <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <h1 className="text-xl font-bold text-foreground">Notificaciones</h1>
                        {unread.length > 0 && (
                            <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5 font-medium">
                                {unread.length}
                            </span>
                        )}
                    </div>
                    {unread.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllRead} className="text-muted-foreground hover:text-foreground">
                            <CheckCheck className="mr-1.5 h-4 w-4" />
                            Marcar todas como leídas
                        </Button>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <BellOff className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No tenés notificaciones todavía.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((n) => (
                            <Card
                                key={n.id}
                                className={`border transition-colors ${
                                    n.read_at
                                        ? 'bg-card border-border'
                                        : 'bg-muted/60 border-border'
                                }`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl shrink-0 mt-0.5">
                                            {TYPE_ICONS[n.type] ?? '🔔'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-medium ${n.read_at ? 'text-foreground' : 'text-foreground'}`}>
                                                    {n.title}
                                                </p>
                                                <span className="text-xs text-muted-foreground shrink-0">
                                                    {timeAgo(n.created_at)}
                                                </span>
                                            </div>
                                            {n.body && (
                                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2">
                                                {n.link && (
                                                    <Link
                                                        href={n.link}
                                                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        Ver
                                                    </Link>
                                                )}
                                                {!n.read_at && (
                                                    <button
                                                        onClick={() => markRead(n.id)}
                                                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Check className="h-3 w-3" />
                                                        Marcar leída
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {!n.read_at && (
                                            <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                                        )}
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
