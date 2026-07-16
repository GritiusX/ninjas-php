import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function FlashToasts() {
    useEffect(() => {
        return router.on('success', (event) => {
            const flash = event.detail.page.props.flash as { success?: string; error?: string } | undefined;
            if (flash?.success) toast.success(flash.success);
            if (flash?.error)   toast.error(flash.error);
        });
    }, []);

    return null;
}
