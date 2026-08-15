import { Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import * as pmRoutes from '@/routes/pm';
import type { Auth, ContentPiece } from '@/types';

export function OpenAsEditorLink({ piece }: { piece: ContentPiece }) {
    const { auth } = usePage<{ auth: Auth }>().props;

    if (auth.user.role === 'editor' || auth.user.id !== piece.assigned_editor_id) {
        return null;
    }

    return (
        <Link href={pmRoutes.task.url(piece.id)}>
            <Button size="sm" variant="outline" className="h-7">
                Abrir
            </Button>
        </Link>
    );
}
