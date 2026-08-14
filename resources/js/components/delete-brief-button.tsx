import { router, usePage } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import * as briefRoutes from '@/routes/pm/brief';
import type { Auth } from '@/types';

type Props = {
    pieceId: number;
    label?: string | null;
    variant?: 'icon' | 'button';
    onDeleted?: () => void;
};

export function DeleteBriefButton({ pieceId, label, variant = 'icon', onDeleted }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    if (auth.user.role !== 'admin' && auth.user.role !== 'superadmin') return null;

    function confirmDelete() {
        setProcessing(true);
        router.delete(briefRoutes.destroy.url(pieceId), {
            onSuccess: () => onDeleted?.(),
            onFinish: () => {
                setProcessing(false);
                setOpen(false);
            },
        });
    }

    return (
        <>
            {variant === 'icon' ? (
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="Borrar tarea"
                    onClick={() => setOpen(true)}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            ) : (
                <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Borrar tarea
                </Button>
            )}

            <Dialog open={open} onOpenChange={(v) => !processing && setOpen(v)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Borrar tarea</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        {label ? `"${label}"` : 'Esta tarea'} se va a borrar permanentemente, junto con todo su historial.{' '}
                        <span className="font-medium text-destructive">Esta acción no se puede recuperar.</span>
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={processing}>
                            {processing ? 'Borrando...' : 'Borrar definitivamente'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
