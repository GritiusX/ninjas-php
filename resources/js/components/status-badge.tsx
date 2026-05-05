import { Badge } from '@/components/ui/badge';
import type { ContentStatus } from '@/types';

const STATUS_CONFIG: Record<ContentStatus, { label: string; className: string }> = {
    BRIEF: { label: 'Brief', className: 'bg-slate-600 text-slate-100 hover:bg-slate-600' },
    EDITING: { label: 'Editando', className: 'bg-blue-600 text-blue-100 hover:bg-blue-600' },
    INTERNAL_REVIEW: { label: 'Revisión Interna', className: 'bg-amber-500 text-amber-950 hover:bg-amber-500' },
    REVISION: { label: 'Cambios', className: 'bg-orange-600 text-orange-100 hover:bg-orange-600' },
    PM_APPROVED: { label: 'Aprobado PM', className: 'bg-teal-600 text-teal-100 hover:bg-teal-600' },
    CLIENT_REVIEW: { label: 'Rev. Cliente', className: 'bg-purple-600 text-purple-100 hover:bg-purple-600' },
    CLIENT_REVISION: { label: 'Cambios Cliente', className: 'bg-rose-600 text-rose-100 hover:bg-rose-600' },
    CLIENT_APPROVED: { label: 'Aprobado', className: 'bg-green-600 text-green-100 hover:bg-green-600' },
};

export function StatusBadge({ status }: { status: ContentStatus }) {
    const config = STATUS_CONFIG[status];
    return (
        <Badge className={config.className}>
            {config.label}
        </Badge>
    );
}
