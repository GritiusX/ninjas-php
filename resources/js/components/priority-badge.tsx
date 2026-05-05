import { Badge } from '@/components/ui/badge';
import type { Priority } from '@/types';

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
    1: { label: 'Crítico', className: 'bg-red-600 text-red-100 hover:bg-red-600' },
    2: { label: 'Alto', className: 'bg-orange-500 text-orange-100 hover:bg-orange-500' },
    3: { label: 'Medio', className: 'bg-yellow-500 text-yellow-950 hover:bg-yellow-500' },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
    const config = PRIORITY_CONFIG[priority];
    return (
        <Badge className={config.className}>
            {config.label}
        </Badge>
    );
}
